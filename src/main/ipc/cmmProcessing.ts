import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';
import { extractPdfTextRange, renderPdfCoverPng } from './pdfExtraction';
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

interface ExtractionResult {
  title: string;
  cmmNumber: string | null;
  manufacturer: string | null;
  revision: string | null;
  revisionDate: string | null;
  summary: string;
  sections: Array<{ sectionId: string; pageNumber: number }>;
}

function buildPrompt(pages: { page: number; text: string }[]): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are an expert at reading aviation Component Maintenance Manuals (CMMs), which follow the ATA iSpec 2200 standard.

  Given the first pages of a CMM (transmittal letter, title page, and table of contents), extract structured metadata.

  Return ONLY a JSON object with this exact shape, no other text:
  {
    "title": string,           // the component name ONLY, 4-5 words maximum, e.g. "Nose Radome". No boilerplate, no prefixes like "CMM" or "Rev".
    "cmmNumber": string|null,  // raw number only, e.g. "53-51-21". Do NOT include the word "CMM".
    "manufacturer": string|null,
    "revision": string|null,   // raw revision number only, e.g. "12". Do NOT include the word "Rev".
    "revisionDate": string|null, // strict ISO 8601: YYYY-MM-DD. Convert non-standard source dates yourself. null if not found.
    "summary": string,         // EXACTLY 40 words or fewer, plain English.
    "sections": [
      { "sectionId": string, "pageNumber": number }
    ]
  }

  For "sections", only include entries you can confidently find in the table of contents, using EXACTLY these IDs where applicable: ${KNOWN_SECTION_IDS.join(', ')}. Use the page number as printed in the TOC. If a section isn't listed, omit it — do not guess.`;
  const userPrompt = pages
    .map((p) => `[Page ${p.page}]\n${p.text}`)
    .join('\n\n');

  return { systemPrompt, userPrompt };
}

export async function processNewCmm(
  uploadedFilePath: string,
  _selectedSectionIds: string[],
  ): Promise<{ id: number }> {
  const pages = await extractPdfTextRange(uploadedFilePath, 1, 100);
  const { systemPrompt, userPrompt } = buildPrompt(pages);
  const result = await getStructuredCompletion<ExtractionResult>(systemPrompt, userPrompt);
  const [inserted] = await db
    .insert(cmms)
    .values({
      title: result.title,
      cmmNumber: result.cmmNumber,
      manufacturer: result.manufacturer,
      revision: result.revision,
      revisionDate: result.revisionDate ? new Date(result.revisionDate) : null,
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
      { summary: result.summary, revision: result.revision, revisionDate: result.revisionDate },
      null,
      2,
    ),
  );
  await fs.writeFile(getCmmSectionsPath(id), JSON.stringify(result.sections, null, 2));
  await fs.writeFile(getCmmRawTextPath(id), JSON.stringify(pages, null, 2));

  await db.update(cmms).set({ filePath: folderPath }).where(eq(cmms.id, id));

  return { id };
}

/**
 * Registers the process-new-cmm IPC handler. Call from app.on('ready'),
 * alongside registerCMMHandlers() and registerCmmAssetProtocolHandler().
 */
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