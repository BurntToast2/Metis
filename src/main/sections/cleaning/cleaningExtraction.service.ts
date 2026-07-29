import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { findReferencedSections } from '../common/referenceExtraction';
import { extractTasksAndTools } from '../common/taskExtraction';
import {
  buildCleaningReferenceFinderSystemPrompt,
  buildCleaningReferenceFinderUserPrompt,
  buildCleaningTaskExtractionSystemPrompt,
  buildCleaningTaskExtractionUserPrompt,
} from '../../prompts/cleaningExtraction.prompts';
import type { SectionRef, SectionExtractionResult } from '../common/section.types';
import { loadCmmTextIndex, getSectionContent } from '../../storage/CMMSectionContent';
import { getCmmExtractedSectionPath } from '../../storage/CMMPaths';
import { registerTaskReferences } from '../common/registerTaskReferences';

async function readExistingResult(
  cmmId: number,
  sectionId: string,
): Promise<SectionExtractionResult | null> {
  const outPath = getCmmExtractedSectionPath(cmmId, 'cleaning', sectionId);
  try {
    const raw = await readFile(outPath, 'utf-8');
    return JSON.parse(raw) as SectionExtractionResult;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[cleaningExtraction] existing result unreadable, re-extracting:', err);
    }
    return null;
  }
}

async function saveExtractionResult(result: SectionExtractionResult): Promise<void> {
  const outPath = getCmmExtractedSectionPath(result.cmmId, 'cleaning', result.sectionId);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
}

export async function runCleaningExtraction({
  cmmId,
  sectionId,
}: SectionRef): Promise<SectionExtractionResult> {
  const existing = await readExistingResult(cmmId, sectionId);
  if (existing) {
    return existing;
  }

  // Step 1: LLM call #1 
  const index = await loadCmmTextIndex(cmmId);
  const cleaningSectionContent = getSectionContent(index, sectionId);

  const validSectionIds = index.sections
    .map((s) => s.sectionId)
    .filter((id) => id !== sectionId);

  const { referencedSections: rawReferencedSections } = await findReferencedSections(
    cleaningSectionContent,
    validSectionIds,
    buildCleaningReferenceFinderSystemPrompt,
    buildCleaningReferenceFinderUserPrompt,
  );

  const modelReferencedSections = rawReferencedSections.filter((ref) => {
    const isValid = validSectionIds.includes(ref.sectionId);
    if (!isValid) {
      console.warn(
        `[cleaningExtraction] dropping unresolvable referenced section "${ref.sectionId}"`,
      );
    }
    return isValid;
  });

  const ALWAYS_INCLUDED_SECTION_IDS = ['introduction', 'description-operation'];
  const baselineSectionIds = ALWAYS_INCLUDED_SECTION_IDS.filter((id) =>
    validSectionIds.includes(id),
  );

  const referencedSectionIdSet = new Set([
    ...modelReferencedSections.map((r) => r.sectionId),
    ...baselineSectionIds,
  ]);
  const referencedSections = [...referencedSectionIdSet].map((id) => ({ sectionId: id }));

  // Step 2: no LLM involved
  const referencedContents = referencedSections.map((ref) => ({
    sectionId: ref.sectionId,
    content: getSectionContent(index, ref.sectionId),
  }));

  // Step 3: LLM call #2 
  const { tasks } = await extractTasksAndTools(
    cleaningSectionContent,
    referencedContents,
    buildCleaningTaskExtractionSystemPrompt,
    buildCleaningTaskExtractionUserPrompt,
  );

  const result: SectionExtractionResult = {
    cmmId,
    sectionId,
    referencedSectionIds: referencedSections.map((r) => r.sectionId),
    tasks,
  };

  await saveExtractionResult(result);
  
  for (const task of tasks) {
    await registerTaskReferences(cmmId, sectionId, task);
  }

  return result;
}