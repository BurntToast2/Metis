import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { findReferencedSections } from './referenceExtraction';
import { extractTasksAndTools } from './taskExtraction';
import type { SectionRef, TestingExtractionResult } from './testing.types';
import { loadCmmTextIndex, getSectionContent } from '../../storage/CMMSectionContent';
import { getCmmExtractedSectionPath } from '../../storage/CMMPaths';

async function readExistingResult(
  cmmId: number,
  sectionId: string,
): Promise<TestingExtractionResult | null> {
  const outPath = getCmmExtractedSectionPath(cmmId, 'testing', sectionId);
  try {
    const raw = await readFile(outPath, 'utf-8');
    return JSON.parse(raw) as TestingExtractionResult;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[testingExtraction] existing result unreadable, re-extracting:', err);
    }
    return null;
  }
}

async function saveExtractionResult(result: TestingExtractionResult): Promise<void> {
  const outPath = getCmmExtractedSectionPath(result.cmmId, 'testing', result.sectionId);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
}

export async function runTestingExtraction({
  cmmId,
  sectionId,
}: SectionRef): Promise<TestingExtractionResult> {
  const existing = await readExistingResult(cmmId, sectionId);
  if (existing) {
    return existing;
  }

  // Step 1: LLM call #1 — send only the testing section, get back which other
  // sections it references. Constrained to section IDs that actually exist
  // in this CMM's sections.json, so it can't report something (a table, a
  // figure) that step 2 has no way to resolve.
  const index = await loadCmmTextIndex(cmmId);
  const testingSectionContent = getSectionContent(index, sectionId);

  const validSectionIds = index.sections
    .map((s) => s.sectionId)
    .filter((id) => id !== sectionId);

  const { referencedSections: rawReferencedSections } = await findReferencedSections(
    testingSectionContent,
    validSectionIds,
  );

  const modelReferencedSections = rawReferencedSections.filter((ref) => {
    const isValid = validSectionIds.includes(ref.sectionId);
    if (!isValid) {
      console.warn(
        `[testingExtraction] dropping unresolvable referenced section "${ref.sectionId}"`,
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

  // Step 2: no LLM involved — resolve each referenced section's pages from sections.json, then pull its actual text out of raw-text.json.
  const referencedContents = referencedSections.map((ref) => ({
    sectionId: ref.sectionId,
    content: getSectionContent(index, ref.sectionId),
  }));

  // Step 3: LLM call #2 — testing section + referenced sections' text together,
  const { tasks } = await extractTasksAndTools(testingSectionContent, referencedContents);

  const result: TestingExtractionResult = {
    cmmId,
    sectionId,
    referencedSectionIds: referencedSections.map((r) => r.sectionId),
    tasks,
  };

  await saveExtractionResult(result);

  return result;
}