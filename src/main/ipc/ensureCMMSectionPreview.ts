import { ipcMain } from 'electron';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import {
  getCmmPdfPath,
  getCmmSectionsFolderPath,
  getCmmSectionPreviewPath,
  getCmmSectionsPath,
} from '../storage/CMMPaths';
import { renderPdfPagePng } from './pdfExtraction';

export function registerEnsureCmmSectionPreviewsHandler() {
  ipcMain.handle('ensure-cmm-section-previews', async (_event, id: number) => {
    const folderPath = getCmmSectionsFolderPath(id);

    try {
      await access(folderPath);
      return { generated: false }; // folder already exists, nothing to do
    } catch {
      // folder doesn't exist — generate everything
    }

    await mkdir(folderPath, { recursive: true });

    const sectionsRaw = await readFile(getCmmSectionsPath(id), 'utf-8');
    const sections: { sectionId: string; startPage: number; endPage: number }[] = JSON.parse(sectionsRaw);
    const pdfPath = getCmmPdfPath(id);

    for (const section of sections) {
      const png = await renderPdfPagePng(pdfPath, section.startPage, 1.5);
      await writeFile(getCmmSectionPreviewPath(id, section.sectionId), png);
    }

    return { generated: true };
  });
}