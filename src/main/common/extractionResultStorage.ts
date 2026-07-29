import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getCmmExtractedSectionPath } from '../storage/CMMPaths';
import type { SectionExtractionResult } from '../../shared/types/sections';

export async function readExtractionResult(
  cmmId: number,
  kind: string,
  sectionId: string,
): Promise<SectionExtractionResult | null> {
  const outPath = getCmmExtractedSectionPath(cmmId, kind, sectionId);
  try {
    const raw = await readFile(outPath, 'utf-8');
    return JSON.parse(raw) as SectionExtractionResult;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`[extractionResultStorage] result for "${sectionId}" unreadable:`, err);
    }
    return null;
  }
}

export async function saveExtractionResult(kind: string, result: SectionExtractionResult): Promise<void> {
  const outPath = getCmmExtractedSectionPath(result.cmmId, kind, result.sectionId);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
}