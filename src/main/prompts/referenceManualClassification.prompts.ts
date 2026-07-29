import type { PageText } from '../ipc/pdfExtraction';

export const REFERENCE_MANUAL_FALLBACK_SECTION_ID = 'other';

/**
 * Classifies every page of an uploaded reference manual (SRM, SOPM, AMM,
 * NTM, etc.) into whatever chapter/section/subject number is actually
 * printed on that page — open-ended, unlike CMM classification which picks
 * from a fixed 14-entry enum. These manuals don't share one numbering
 * convention (SRM/AMM/NTM follow ATA iSpec 2200 chapter-section-subject
 * numbers; SOPMs often use their own internal process numbering), so
 * there's no closed set to constrain the model to.
 */
export function buildReferenceManualClassificationPrompt(pages: PageText[]): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are reading page excerpts from an aviation reference manual (e.g. a Structural Repair Manual, Standard Overhaul Practices Manual, Aircraft Maintenance Manual, or Nondestructive Testing Manual).

For EACH page given, you are shown the first and last ~30 words of that physical page's text (with "..." marking the gap between them, if the page has more text than that). Use whatever running header, chapter/section/subject number, or contextual content appears to determine which chapter or subject this physical page belongs to.

Transcribe the chapter/section/subject number EXACTLY as printed on the page (e.g. "53-30-01", "57-10", "70-22-04") — do not invent numbering, do not normalize punctuation, do not guess a number that isn't actually printed. If a page's own heading uses a title instead of a number, use that title verbatim instead.

Use "${REFERENCE_MANUAL_FALLBACK_SECTION_ID}" for front matter — title page, transmittal letter, record of revisions, table of contents, list of effective pages, list of illustrations — or any page with no identifiable chapter/subject of its own.

A page with little or no distinguishing text of its own (e.g. a mostly-blank page, or a figure/table with no visible header) belongs to the SAME chapter as the physical page immediately before it — use page order and surrounding context, not just the words on that one page in isolation.

Chapters are contiguous — once a chapter has ended and a later one has begun, do not classify any subsequent page back into an earlier chapter, even if a sub-heading elsewhere reuses similar wording.

Return ONLY valid JSON in this exact shape, no other text, with exactly one entry per page given, in page order:
{
  "pages": [
    { "page": number, "sectionId": string }
  ]
}`;

  const userPrompt = pages.map((p) => `[PDF page ${p.page}]\n${p.text}`).join('\n\n');
  return { systemPrompt, userPrompt };
}