import { app } from 'electron';
import path from 'path';

const STORAGE_ROOT = () => path.join(app.getPath('userData'), 'storage', 'cmms');

export function getCmmFolderPath(id: number): string {
  return path.join(STORAGE_ROOT(), String(id));
}

export function getCmmPdfPath(id: number): string {
  return path.join(getCmmFolderPath(id), 'cmm.pdf');
}

export function getCmmCoverPath(id: number): string {
  return path.join(getCmmFolderPath(id), 'cover.png');
}

export function getCmmSummaryPath(id: number): string {
  return path.join(getCmmFolderPath(id), 'summary.json');
}

export function getCmmSectionsPath(id: number): string {
  return path.join(getCmmFolderPath(id), 'sections.json');
}

export function getCmmRawTextPath(id: number): string {
  return path.join(getCmmFolderPath(id), 'raw-text.json');
}