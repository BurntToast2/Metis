import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';
import {
  extractPdfTextRange,
  extractPdfPageBoundarySnippets,
  renderPdfCoverPng,
  getPdfPageCount,
} from './pdfExtraction';
import type { PageText } from './pdfExtraction';
import { getStructuredCompletion } from './llm';
import { db } from '../db';
import { cmms } from '../db/schema';
import {
  getCmmFolderPath,
  getCmmSummaryPath,
  getCmmSectionsPath,
  getCmmRawTextPath,
  getCmmPdfPath,
  getCmmCoverPath,
} from '../storage/CMMPaths';
import { pageClassificationsToRanges } from '../common/pageClassification';
import type { PageClassification } from '../common/pageClassification';

const KNOWN_SECTION_IDS = [
  'introduction',
  'cmm-revisions',
  'service-bulletins',
  'description-operation',
  'testing-fault-isolation',
  'schematics-wiring',
  'disassembly',
  'cleaning',
  'inspection-check',
  'repairs',
  'assembly',
  'fits-clearances',
  'special-tools',
  'illustrated-parts-list',
] as const;

const FALLBACK_SECTION_ID = 'other';

interface CmmMetadata {
  title: string;
  cmmNumber: string | null;
  manufacturer: string | null;
  revision: string | null;
  revisionDate: string | null;
  summary: string;
  platform: string | null;
}

function buildMetadataPrompt(pages: PageText[]): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are an expert at reading aviation Component Maintenance Manuals (CMMs), which follow the ATA iSpec 2200 standard.

Given the front matter of a CMM (transmittal letter, title page, table of contents), extract structured metadata.

Return ONLY a JSON object with this exact shape, no other text:
{
  "title": string,           // component name ONLY, 4-5 words max, e.g. "Nose Radome". No "CMM"/"Rev" prefixes.
  "cmmNumber": string|null,  // raw number only, e.g. "53-51-21".
  "manufacturer": string|null,
  "revision": string|null,   // raw revision number only, e.g. "12".
  "revisionDate": string|null, // strict ISO 8601: YYYY-MM-DD. null if not found.
  "summary": string,         // EXACTLY 40 words or fewer, plain English.
  "platform": string|null    // aircraft type/model this component is applicable to, if stated
                              // (e.g. "737-800", "A320-200"). Raw as printed, no manufacturer
                              // prefix. null if the front matter doesn't state applicability —
                              // do not guess from the manufacturer or component type.
}`;
  const userPrompt = pages.map((p) => `[Page ${p.page}]\n${p.text}`).join('\n\n');
  return { systemPrompt, userPrompt };
}

/**
 * Classifies every physical page of the manual into a top-level chapter,
 * using only each page's own first/last ~40 words (running headers,
 * chapter titles, contextual content) rather than parsing any front-matter
 * table. Front-matter tables listing "effective pages" vary too much
 * between manufacturers to parse reliably (page-per-row LOEP vs.
 * task/subtask-per-row LOEC, differing column layouts, etc.) — reading
 * each page directly sidesteps all of that.
 */
function buildPageClassificationPrompt(pages: PageText[]): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are reading page excerpts from an aviation Component Maintenance Manual (CMM), which follows the ATA iSpec 2200 standard.

For EACH page given, you are shown the first and last ~40 words of that physical page's text (with "..." marking the gap between them, if the page has more text than that). Use whatever running headers, chapter titles, or contextual content appears to determine which top-level chapter that physical page belongs to.

Classify each page into exactly one of these section IDs:
${KNOWN_SECTION_IDS.join(', ')}, ${FALLBACK_SECTION_ID}

Use "${FALLBACK_SECTION_ID}" for front matter — title page, transmittal letter, highlights, record of revisions, record of temporary revisions, service bulletin list, any "list of effective pages/content" table, table of contents, list of illustrations, list of tables — or any page that doesn't clearly belong to one of the known chapters.

A page with little or no distinguishing text of its own (e.g. a mostly-blank page, or a figure/table with no visible header) belongs to the SAME chapter as the physical page immediately before it — use page order and surrounding context, not just the words on that one page in isolation.

Chapters are contiguous — once a chapter has ended and a later chapter has begun, do not classify any subsequent page back into an earlier chapter, even if a sub-heading elsewhere reuses similar wording.

Return ONLY valid JSON in this exact shape, no other text, with exactly one entry per page given, in page order:
{
  "pages": [
    { "page": number, "sectionId": string }
  ]
}`;
  const userPrompt = pages.map((p) => `[PDF page ${p.page}]\n${p.text}`).join('\n\n');
  return { systemPrompt, userPrompt };
}

export async function processNewCmm(
  uploadedFilePath: string,
  _selectedSectionIds: string[],
): Promise<{ id: number }> {
  const totalPages = await getPdfPageCount(uploadedFilePath);

  const boundarySnippets = await extractPdfPageBoundarySnippets(uploadedFilePath, 1, totalPages);
  const { systemPrompt: classifySystem, userPrompt: classifyUser } =
    buildPageClassificationPrompt(boundarySnippets);
  const { pages: classifications } = await getStructuredCompletion<{
    pages: PageClassification[];
  }>(classifySystem, classifyUser, {
    maxTokens: Math.max(8000, totalPages * 20),
  });

  const sectionRanges = pageClassificationsToRanges(classifications, FALLBACK_SECTION_ID);

  const introRange = sectionRanges.find((r) => r.sectionId === 'introduction');
  const frontMatterEndPage = introRange ? introRange.endPage : Math.min(20, totalPages);

  const fullTextPages = await extractPdfTextRange(uploadedFilePath, 1, totalPages);
  const frontMatterPages = fullTextPages.slice(0, frontMatterEndPage);

  const { systemPrompt: metaSystem, userPrompt: metaUser } = buildMetadataPrompt(frontMatterPages);
  const metadata = await getStructuredCompletion<CmmMetadata>(metaSystem, metaUser);

  const [inserted] = await db
    .insert(cmms)
    .values({
      title: metadata.title,
      cmmNumber: metadata.cmmNumber,
      manufacturer: metadata.manufacturer,
      revision: metadata.revision,
      revisionDate: metadata.revisionDate ? new Date(metadata.revisionDate) : null,
      platform: metadata.platform,
      filePath: '',
    })
    .returning();

  const id = inserted.id;
  const folderPath = getCmmFolderPath(id);
  await fs.mkdir(folderPath, { recursive: true });

  await fs.copyFile(uploadedFilePath, getCmmPdfPath(id));
  const coverPng = await renderPdfCoverPng(getCmmPdfPath(id));
  await fs.writeFile(getCmmCoverPath(id), coverPng);

  await fs.writeFile(
    getCmmSummaryPath(id),
    JSON.stringify(
      { summary: metadata.summary, revision: metadata.revision, revisionDate: metadata.revisionDate },
      null,
      2,
    ),
  );
  await fs.writeFile(getCmmSectionsPath(id), JSON.stringify(sectionRanges, null, 2));
  await fs.writeFile(getCmmRawTextPath(id), JSON.stringify(fullTextPages, null, 2));

  await db.update(cmms).set({ filePath: folderPath }).where(eq(cmms.id, id));

  return { id };
}

export function registerCmmProcessingHandlers() {
  ipcMain.handle(
    'process-new-cmm',
    async (_event, uploadedFilePath: string, selectedSectionIds: string[]) => {
      try {
        return await processNewCmm(uploadedFilePath, selectedSectionIds);
      } catch (err) {
        console.error('process-new-cmm failed:', err);
        throw err;
      }
    },
  );
}