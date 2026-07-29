export interface PageClassification {
  page: number;
  sectionId: string;
}

export interface SectionRange {
  sectionId: string;
  startPage: number;
  endPage: number;
}

/**
 * Collapses per-page classifications into contiguous section ranges.
 * Driven entirely by the LLM's page-by-page judgment, not by any table's
 * printed page labels or row order.
 *
 * Shared between CMM ingestion (closed set of 14 known section IDs) and
 * reference-manual ingestion (open-ended chapter/subject numbers) — the
 * collapsing logic itself doesn't care which kind of ID it's looking at.
 *
 * @param fallbackSectionId - entries with this sectionId are dropped
 * entirely rather than turned into a range (front matter, TOC, etc.)
 */
export function pageClassificationsToRanges(
  classifications: PageClassification[],
  fallbackSectionId: string,
): SectionRange[] {
  const ranges: SectionRange[] = [];

  for (const { page, sectionId } of classifications) {
    if (sectionId === fallbackSectionId) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.sectionId === sectionId && page === last.endPage + 1) {
      last.endPage = page;
    } else {
      ranges.push({ sectionId, startPage: page, endPage: page });
    }
  }

  return ranges;
}