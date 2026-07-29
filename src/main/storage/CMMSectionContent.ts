import { readFile } from 'fs/promises';
import { getCmmSectionsPath, getCmmRawTextPath } from './CMMPaths';

export interface SectionsJsonEntry {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface RawTextPage {
  page: number;
  text: string;
}

export interface CmmTextIndex {
  sections: SectionsJsonEntry[];
  rawTextByPage: Map<number, string>;
}

export async function loadCmmTextIndex(cmmId: number): Promise<CmmTextIndex> {
  const [sectionsRaw, rawTextRaw] = await Promise.all([
    readFile(getCmmSectionsPath(cmmId), 'utf-8'),
    readFile(getCmmRawTextPath(cmmId), 'utf-8'),
  ]);

  const sections = JSON.parse(sectionsRaw) as SectionsJsonEntry[];
  const rawTextPages = JSON.parse(rawTextRaw) as RawTextPage[];

  const rawTextByPage = new Map(rawTextPages.map((p) => [p.page, p.text]));

  return { sections, rawTextByPage };
}

export function getSectionPages(index: CmmTextIndex, sectionId: string): number[] {
  const entry = index.sections.find((s) => s.sectionId === sectionId);
  if (!entry) {
    throw new Error(`Section "${sectionId}" not found in sections.json`);
  }
  const pages: number[] = [];
  for (let page = entry.startPage; page <= entry.endPage; page += 1) {
    pages.push(page);
  }
  return pages;
}

export function getTextForPages(index: CmmTextIndex, pages: number[]): string {
  return pages
    .map((page) => `--- PAGE ${page} ---\n${index.rawTextByPage.get(page) ?? ''}`)
    .join('\n\n');
}

export function getSectionContent(index: CmmTextIndex, sectionId: string): string {
  return getTextForPages(index, getSectionPages(index, sectionId));
}