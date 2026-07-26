import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { findReferencedSections } from '../common/referenceExtraction';
import { extractTasksAndTools } from '../common/taskExtraction';
import {
  buildDisassemblyReferenceFinderSystemPrompt,
  buildDisassemblyReferenceFinderUserPrompt,
  buildDisassemblyTaskExtractionSystemPrompt,
  buildDisassemblyTaskExtractionUserPrompt,
} from '../../prompts/disassemblyExtraction.prompts';
import type { SectionRef, SectionExtractionResult } from '../common/section.types';
import { loadCmmTextIndex, getSectionContent } from '../../storage/CMMSectionContent';
import { getCmmExtractedSectionPath } from '../../storage/CMMPaths';

async function readExistingResult(
  cmmId: number,
  sectionId: string,
): Promise<SectionExtractionResult | null> {
  const outPath = getCmmExtractedSectionPath(cmmId, 'disassembly', sectionId);
  try {
    const raw = await readFile(outPath, 'utf-8');
    return JSON.parse(raw) as SectionExtractionResult;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      // File exists but is unreadable/corrupt — treat as no cache and re-extract
      // rather than crashing the click handler.
      console.warn('[disassemblyExtraction] existing result unreadable, re-extracting:', err);
    }
    return null;
  }
}

async function saveExtractionResult(result: SectionExtractionResult): Promise<void> {
  const outPath = getCmmExtractedSectionPath(result.cmmId, 'disassembly', result.sectionId);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
}

export async function runDisassemblyExtraction({
  cmmId,
  sectionId,
}: SectionRef): Promise<SectionExtractionResult> {
  // Skip the whole pipeline if we've already extracted this section before.
  const existing = await readExistingResult(cmmId, sectionId);
  if (existing) {
    return existing;
  }

  // Step 1: LLM call #1 — send only the disassembly section, get back which
  // other sections it references. Constrained to section IDs that actually
  // exist in this CMM's sections.json, so it can't report something (a table,
  // a figure) that step 2 has no way to resolve.
  const index = await loadCmmTextIndex(cmmId);
  const disassemblySectionContent = getSectionContent(index, sectionId);

  const validSectionIds = index.sections
    .map((s) => s.sectionId)
    .filter((id) => id !== sectionId);

  const { referencedSections: rawReferencedSections } = await findReferencedSections(
    disassemblySectionContent,
    validSectionIds,
    buildDisassemblyReferenceFinderSystemPrompt,
    buildDisassemblyReferenceFinderUserPrompt,
  );

  // Backstop in case the model reports something outside the constraint
  // above anyway — drop it rather than crash step 2 trying to resolve it.
  const modelReferencedSections = rawReferencedSections.filter((ref) => {
    const isValid = validSectionIds.includes(ref.sectionId);
    if (!isValid) {
      console.warn(
        `[disassemblyExtraction] dropping unresolvable referenced section "${ref.sectionId}"`,
      );
    }
    return isValid;
  });

  // introduction and description-operation are always folded in as baseline
  // context — the general operating principles they contain can matter for
  // interpreting a disassembly step even when the section never explicitly
  // cites them, unlike testing/repairs/etc. which only get pulled in when
  // the model actually finds a reference. Only added if this particular CMM
  // has that section at all (not every manual does).
  const ALWAYS_INCLUDED_SECTION_IDS = ['introduction', 'description-operation'];
  const baselineSectionIds = ALWAYS_INCLUDED_SECTION_IDS.filter((id) =>
    validSectionIds.includes(id),
  );

  const referencedSectionIdSet = new Set([
    ...modelReferencedSections.map((r) => r.sectionId),
    ...baselineSectionIds,
  ]);
  const referencedSections = [...referencedSectionIdSet].map((id) => ({ sectionId: id }));

  // Step 2: no LLM involved — resolve each referenced section's pages from
  // sections.json, then pull its actual text out of raw-text.json.
  const referencedContents = referencedSections.map((ref) => ({
    sectionId: ref.sectionId,
    content: getSectionContent(index, ref.sectionId),
  }));

  // Step 3: LLM call #2 — disassembly section + referenced sections' text
  // together, split into tasks (with lightweight sub-tasks, detailed
  // tools/consumables).
  const { tasks } = await extractTasksAndTools(
    disassemblySectionContent,
    referencedContents,
    buildDisassemblyTaskExtractionSystemPrompt,
    buildDisassemblyTaskExtractionUserPrompt,
  );

  const result: SectionExtractionResult = {
    cmmId,
    sectionId,
    referencedSectionIds: referencedSections.map((r) => r.sectionId),
    tasks,
  };

  await saveExtractionResult(result);

  return result;
}