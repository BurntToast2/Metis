import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';
import {
  extractPdfTextRange,
  extractPdfPageSnippets,
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

// The LOEP's own entry in its own table — used as a calibration anchor to
// convert row position into physical PDF page. Filtered out of final ranges.
const LOEP_SECTION_ID = 'list-of-effective-pages';

// Title pages, transmittal letters, TOC, record-of-revisions, blank pages —
// anything with no identifiable section header. Filtered out of the final ranges.
const FALLBACK_SECTION_ID = 'other';

// LOEP tables have been observed running as long as ~20 physical pages, and
// continuation pages can't be reliably detected from text — they don't
// always repeat the title or a fixed column header, and formatting varies
// manual to manual. So instead of trying to detect where the table ends,
// pull a generously-sized fixed window and let the LLM (which already has
// to read every row) recognize where the real content begins.
const LOEP_MAX_PAGES = 25;

interface CmmMetadata {
  title: string;
  cmmNumber: string | null;
  manufacturer: string | null;
  revision: string | null;
  revisionDate: string | null;
  summary: string;
}

interface SectionRange {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface LoepEntry {
  sectionId: string;
  printedPage: string;
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
  "summary": string          // EXACTLY 40 words or fewer, plain English.
}`;
  const userPrompt = pages.map((p) => `[Page ${p.page}]\n${p.text}`).join('\n\n');
  return { systemPrompt, userPrompt };
}

/**
 * Finds the physical PDF page where the "List of Effective Pages" table
 * starts, using the cheap first-~40-words-per-page snippets we already pull
 * for the whole document — no LLM call needed for this step.
 */
function findLoepStartPage(snippets: PageText[]): number | null {
  const match = snippets.find((p) => /list of effective pages/i.test(p.text));
  return match ? match.page : null;
}

function buildLoepPrompt(loepPages: PageText[]): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are reading the "List of Effective Pages" (LOEP) table from an aviation Component Maintenance Manual (CMM), which follows the ATA iSpec 2200 standard.

The table lists every page of the manual, in physical top-to-bottom, left-to-right reading order. A repeated "SUBJECT / PAGE / DATE" header (if present) marks a column break within the table — it is NOT a new section and should NOT get its own entry.

You may be given several pages of text beyond the actual end of the table — where the manual's real content begins (e.g. an Introduction or Description chapter: narrative prose and body text, not page/date rows). Stop emitting entries the moment you reach that point, even if there is more text below it in what you were given. Only emit entries for genuine table rows; do not fabricate rows for text that isn't part of this table.

Walk through the table top to bottom and output exactly ONE entry per row, in the exact order the rows are printed. Include every row, even if the manual's own printed page numbers repeat, skip, or look inconsistent — you are recording row order, not validating the printed numbers.

Classify each row's "Subject" into exactly one of these section IDs, based on the header text AS PRINTED — do NOT infer ATA iSpec chapter numbers:
${LOEP_SECTION_ID}, ${KNOWN_SECTION_IDS.join(', ')}, ${FALLBACK_SECTION_ID}

Use "${LOEP_SECTION_ID}" ONLY for the row(s) belonging to the "List of Effective Pages" section itself (i.e. this table's own entry in the list).
Use "${FALLBACK_SECTION_ID}" for title page, transmittal letter, record of revisions, record of temporary revisions, service bulletin list, table of contents, or anything else with no match among the other IDs.

Return ONLY valid JSON in this exact shape, no other text:
{
  "entries": [
    { "sectionId": string, "printedPage": string }
  ]
}`;
  const userPrompt = loepPages.map((p) => `[PDF page ${p.page}]\n${p.text}`).join('\n\n');
  return { systemPrompt, userPrompt };
}

/**
 * The LOEP table lists itself, so we independently know two things about
 * that same page: the physical PDF page it's on (from findLoepStartPage, a
 * plain text search) and the row position it occupies within its own parsed
 * list (from the LLM's row order). The difference is a fixed offset —
 * usually caused by cover pages or scan-inserted blanks that exist in the
 * PDF but were never counted in the manual's own front matter — and it
 * applies uniformly to every row.
 */
function computeLoepOffset(entries: LoepEntry[], loepStartPhysicalPage: number): number {
  const selfIndex = entries.findIndex((e) => e.sectionId === LOEP_SECTION_ID);
  return selfIndex === -1 ? 0 : loepStartPhysicalPage - (selfIndex + 1);
}

/**
 * Applies the calibrated offset to every row to get its true physical PDF
 * page, then collapses consecutive same-section rows into ranges. This is
 * driven entirely by row order, not by the manual's own printed page labels
 * — so typos or gaps in the source manual's numbering don't affect it.
 */
function loepEntriesToPhysicalPages(entries: LoepEntry[], offset: number): SectionRange[] {
  const ranges: SectionRange[] = [];

  entries.forEach((entry, i) => {
    const physicalPage = i + 1 + offset;
    const last = ranges[ranges.length - 1];
    if (last && last.sectionId === entry.sectionId && physicalPage === last.endPage + 1) {
      last.endPage = physicalPage;
    } else {
      ranges.push({ sectionId: entry.sectionId, startPage: physicalPage, endPage: physicalPage });
    }
  });

  return ranges.filter((r) => r.sectionId !== FALLBACK_SECTION_ID && r.sectionId !== LOEP_SECTION_ID);
}

export async function processNewCmm(
  uploadedFilePath: string,
  _selectedSectionIds: string[],
): Promise<{ id: number }> {
  const totalPages = await getPdfPageCount(uploadedFilePath);

  // Cheap first pass over the whole doc (first ~40 words/page, no LLM) just
  // to locate the LOEP. Everything downstream of finding it is arithmetic —
  // this is the only page range that goes to an LLM for classification.
  const allPageSnippets = await extractPdfPageSnippets(uploadedFilePath, 1, totalPages/4);
  const loepStartPhysicalPage = findLoepStartPage(allPageSnippets);

  let sectionRanges: SectionRange[] = [];

  if (loepStartPhysicalPage !== null) {
    const loepEndPage = Math.min(loepStartPhysicalPage + LOEP_MAX_PAGES - 1, totalPages);
    const loepPages = await extractPdfTextRange(uploadedFilePath, loepStartPhysicalPage, loepEndPage);
    const { systemPrompt: loepSystem, userPrompt: loepUser } = buildLoepPrompt(loepPages);
    const { entries } = await getStructuredCompletion<{ entries: LoepEntry[] }>(loepSystem, loepUser, {
      maxTokens: Math.max(8000, totalPages * 20),
    });

    const offset = computeLoepOffset(entries, loepStartPhysicalPage);
    sectionRanges = loepEntriesToPhysicalPages(entries, offset);

    // Sanity check: the last row's computed physical page should land
    // exactly on the document's real page count. If it doesn't, there's a
    // second unexplained gap somewhere and this mapping shouldn't be
    // trusted blindly.
    const lastComputedPage = entries.length + offset;
    if (lastComputedPage !== totalPages) {
      console.warn(
        `LOEP mapping sanity check failed: computed last page ${lastComputedPage}, actual page count ${totalPages}. Section ranges may be unreliable.`,
      );
    }
  } else {
    console.warn('Could not locate "List of Effective Pages" in this CMM — section mapping skipped.');
  }

  // Front matter for metadata extraction runs from page 1 through the end of
  // the "introduction" range. Falls back to a fixed window if intro wasn't
  // found (e.g. no LOEP was located, or the doc has no distinct Introduction
  // section).
  const introRange = sectionRanges.find((r) => r.sectionId === 'introduction');
  const frontMatterEndPage = introRange ? introRange.endPage : Math.min(20, totalPages);
  const frontMatterPages = await extractPdfTextRange(uploadedFilePath, 1, frontMatterEndPage);

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
  await fs.writeFile(getCmmRawTextPath(id), JSON.stringify(frontMatterPages, null, 2));

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