import fs from 'fs/promises';
import { eq } from 'drizzle-orm';
import {
  extractPdfTextRange,
  extractPdfPageBoundarySnippets,
  getPdfPageCount,
} from '../../ipc/pdfExtraction';
import { getStructuredCompletion } from '../../ipc/llm';
import { db } from '../../db';
import { referenceManuals } from '../../db/schema';
import {
  getReferenceManualFolderPath,
  getReferenceManualPdfPath,
  getReferenceManualRawTextPath,
  getReferenceManualSectionsPath,
} from '../../storage/ReferenceManualPaths';
import { pageClassificationsToRanges } from '../../common/pageClassification';
import type { PageClassification } from '../../common/pageClassification';
import { isPlatformScoped, normalizePlatform } from '../../common/referenceKey';
import type { ExternalManualType } from '../../common/referenceKey';
import {
  buildReferenceManualClassificationPrompt,
  REFERENCE_MANUAL_FALLBACK_SECTION_ID,
} from '../../prompts/referenceManualClassification.prompts';
import { resolvePendingReferencesForManual } from './referenceResolution.service';

export interface IngestReferenceManualParams {
  uploadedFilePath: string;
  manualType: ExternalManualType;
  // Only stored for platform-scoped types (SRM/AMM/NTM) — silently
  // dropped for generic types (SOPM/SPEC/CMM) even if supplied.
  platform?: string | null;
}

export async function ingestReferenceManual({
  uploadedFilePath,
  manualType,
  platform = null,
}: IngestReferenceManualParams): Promise<{ id: number }> {
  const totalPages = await getPdfPageCount(uploadedFilePath);

  const boundarySnippets = await extractPdfPageBoundarySnippets(uploadedFilePath, 1, totalPages);
  const { systemPrompt, userPrompt } = buildReferenceManualClassificationPrompt(boundarySnippets);
  const { pages: classifications } = await getStructuredCompletion<{
    pages: PageClassification[];
  }>(systemPrompt, userPrompt, {
    maxTokens: Math.max(8000, totalPages * 20),
  });

  const sectionRanges = pageClassificationsToRanges(
    classifications,
    REFERENCE_MANUAL_FALLBACK_SECTION_ID,
  );

  const fullTextPages = await extractPdfTextRange(uploadedFilePath, 1, totalPages);

  // Normalized before storage — this is the same string that
  // resolvePendingReferencesForManual's equality-based lookup compares
  // against external_references.platform, so both sides must agree on
  // casing/whitespace or valid matches will silently be missed.
  const storedPlatform = isPlatformScoped(manualType) && platform ? normalizePlatform(platform) : null;

  const [inserted] = await db
    .insert(referenceManuals)
    .values({
      manualType,
      platform: storedPlatform,
      filePath: '',
    })
    .returning();

  const id = inserted.id;
  const folderPath = getReferenceManualFolderPath(id);
  await fs.mkdir(folderPath, { recursive: true });

  await fs.copyFile(uploadedFilePath, getReferenceManualPdfPath(id));
  await fs.writeFile(getReferenceManualRawTextPath(id), JSON.stringify(fullTextPages, null, 2));
  await fs.writeFile(getReferenceManualSectionsPath(id), JSON.stringify(sectionRanges, null, 2));

  await db.update(referenceManuals).set({ filePath: folderPath }).where(eq(referenceManuals.id, id));

  // Resolve every pending citation this manual can satisfy immediately —
  // may unblock tasks in CMMs that were sitting on missing-reference
  // cards well before this upload happened.
  await resolvePendingReferencesForManual(id);

  return { id };
}