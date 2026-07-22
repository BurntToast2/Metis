import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { createCanvas } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const workerEntryPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerEntryPath).toString();

export interface PageText {
  page: number;
  text: string;
}

export async function extractPdfTextRange(
  filePath: string,
  startPage: number,
  endPage: number,
): Promise<PageText[]> {
  const doc = await pdfjsLib.getDocument({ url: filePath }).promise;
  const lastPage = Math.min(endPage, doc.numPages);

  const pages: PageText[] = [];
  for (let pageNum = startPage; pageNum <= lastPage; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const text = content.items
      .map((item) => ('str' in (item as TextItem) ? (item as TextItem).str : ''))
      .join(' ');

    pages.push({ page: pageNum, text });
    page.cleanup();
  }

  return pages;
}

/**
 * Renders the first page of a PDF to a PNG buffer, for use as a cover image.
 * `scale` controls resolution — 2 gives a reasonably crisp thumbnail without
 * producing an oversized file for a simple card image.
 */
export async function renderPdfCoverPng(
  filePath: string,
  scale = 2,
): Promise<Buffer> {
  const doc = await pdfjsLib.getDocument({ url: filePath }).promise;
  const page = await doc.getPage(1);
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