import fs from 'fs/promises';
import path from 'path';
import {
  getCmmFolderPath,
  getCmmRawTextPath,
  getCmmSummaryPath,
} from '../storage/CMMPaths';
import type { PageText } from '../ipc/pdfExtraction';
import type { ManualSearchResult, SearchResultPage } from '../../shared/types/search';

const SNIPPET_RADIUS = 60; 

function buildSnippet(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(text.length, matchIndex + matchLength + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

async function listAllCmmIds(): Promise<number[]> {
  const storageRoot = path.dirname(getCmmFolderPath(0));

  let entries: string[];
  try {
    entries = await fs.readdir(storageRoot);
  } catch (err) {
    console.error(`Failed to list CMM storage root at ${storageRoot}:`, err);
    return [];
  }

  return entries
    .map((name) => Number(name))
    .filter((id) => Number.isInteger(id));
}

interface CmmDisplayInfo {
  title: string;
  cmmNumber: string | null;
}

async function readCmmDisplayInfo(id: number): Promise<CmmDisplayInfo> {
  try {
    const raw = await fs.readFile(getCmmSummaryPath(id), 'utf-8');
    const summary = JSON.parse(raw) as string | Record<string, string | number>;

    if (typeof summary === 'string') {
      return { title: `CMM ${id}`, cmmNumber: null };
    }

    const cmmNumber = summary.cmmNumber != null ? String(summary.cmmNumber) : null;
    const title =
      summary.title != null
        ? String(summary.title)
        : cmmNumber
          ? `CMM ${cmmNumber}`
          : `CMM ${id}`;

    return { title, cmmNumber };
  } catch (err) {
    console.error(`Failed to read summary.json for CMM ${id}:`, err);
    return { title: `CMM ${id}`, cmmNumber: null };
  }
}

async function readRawText(id: number): Promise<PageText[]> {
  try {
    const raw = await fs.readFile(getCmmRawTextPath(id), 'utf-8');
    return JSON.parse(raw) as PageText[];
  } catch (err) {
    console.error(`Failed to read raw-text.json for CMM ${id}:`, err);
    return [];
  }
}

export async function searchManuals(query: string): Promise<ManualSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = trimmed.toLowerCase();
  const ids = await listAllCmmIds();

  const results: ManualSearchResult[] = [];

  for (const id of ids) {
    const pages = await readRawText(id);
    const matches: SearchResultPage[] = [];

    for (const { page, text } of pages) {
      const idx = text.toLowerCase().indexOf(needle);
      if (idx !== -1) {
        matches.push({ page, snippet: buildSnippet(text, idx, needle.length) });
      }
    }

    if (matches.length > 0) {
      const { title, cmmNumber } = await readCmmDisplayInfo(id);
      results.push({ cmmId: id, cmmNumber, title, matches });
    }
  }

  return results;
}