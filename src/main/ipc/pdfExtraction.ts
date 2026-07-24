import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const workerEntryPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerEntryPath).toString();

const standardFontDataUrl =
  path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/';

export interface PageText {
  page: number;
  text: string;
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
}

/**
 * pdfjs returns text items in PDF content-stream order, not visual reading
 * order — headers/footers are often drawn last in the stream despite being
 * at the top of the page, and multi-column layouts can interleave
 * unpredictably. This reconstructs true top-to-bottom, left-to-right order
 * using each item's actual position.
 */
function orderItemsByPosition(items: TextItem[]): string {
  const positioned: PositionedItem[] = items
    .filter((item): item is TextItem => 'str' in item && item.str.trim().length > 0)
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }));

  // Group into visual lines: items within a small y-tolerance of each
  // other belong to the same line, since minor sub-pixel jitter is normal
  // even within one line of text.
  const LINE_TOLERANCE = 2;
  const lines: PositionedItem[][] = [];

  for (const item of positioned) {
    const line = lines.find((l) => Math.abs(l[0].y - item.y) <= LINE_TOLERANCE);
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  }

  // PDF y-coordinates increase upward — sort lines top-to-bottom by
  // descending y, then left-to-right by ascending x within each line.
  lines.sort((a, b) => b[0].y - a[0].y);
  lines.forEach((line) => line.sort((a, b) => a.x - b.x));

  return lines.map((line) => line.map((i) => i.str).join(' ')).join('\n');
}

export async function extractPdfTextRange(
  filePath: string,
  startPage: number,
  endPage: number,
): Promise<PageText[]> {
  const doc = await pdfjsLib.getDocument({ url: filePath, standardFontDataUrl }).promise;
  const lastPage = Math.min(endPage, doc.numPages);

  const pages: PageText[] = [];
  for (let pageNum = startPage; pageNum <= lastPage; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const text = orderItemsByPosition(content.items as TextItem[]);

    pages.push({ page: pageNum, text });
    page.cleanup();
  }

  return pages;
}

/**
 * For each page, returns the first and last ~`wordsPerEnd` words of that
 * page's text (in true visual order), joined with "..." if the page has
 * more text than that in between. Used to classify every page of a manual
 * into a section without depending on any front-matter table's structure
 * (LOEP/LOEC tables vary too much between manufacturers to parse reliably —
 * reading each page's own content directly generalizes across all of them).
 */
export async function extractPdfPageBoundarySnippets(
  filePath: string,
  startPage: number,
  endPage: number,
  wordsPerEnd = 40,
): Promise<PageText[]> {
  const doc = await pdfjsLib.getDocument({ url: filePath, standardFontDataUrl }).promise;
  const lastPage = Math.min(endPage, doc.numPages);

  const pages: PageText[] = [];

  for (let pageNum = startPage; pageNum <= lastPage; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = orderItemsByPosition(content.items as TextItem[]);

    const words = text.trim().split(/\s+/).filter(Boolean);
    const snippet =
      words.length <= wordsPerEnd * 2
        ? words.join(' ')
        : `${words.slice(0, wordsPerEnd).join(' ')} ... ${words.slice(-wordsPerEnd).join(' ')}`;

    pages.push({ page: pageNum, text: snippet });
    page.cleanup();
  }

  return pages;
}

export async function getPdfPageCount(filePath: string): Promise<number> {
  const doc = await pdfjsLib.getDocument({ url: filePath, standardFontDataUrl }).promise;
  return doc.numPages;
}

/**
 * Renders a given page of a PDF to a PNG buffer, e.g. for cover images or
 * section preview thumbnails. `scale` controls resolution — 2 gives a
 * reasonably crisp thumbnail without producing an oversized file.
 */
export async function renderPdfPagePng(
  filePath: string,
  pageNumber: number,
  scale = 2,
): Promise<Buffer> {
  const doc = await pdfjsLib.getDocument({ url: filePath, standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context as any, 
    canvas: null,
    viewport,
  }).promise;

  page.cleanup();
  return canvas.toBuffer('image/png');
}

/**
 * Renders the first page of a PDF to a PNG buffer, for use as a cover image.
 */
export async function renderPdfCoverPng(
  filePath: string,
  scale = 2,
): Promise<Buffer> {
  return renderPdfPagePng(filePath, 1, scale);
}