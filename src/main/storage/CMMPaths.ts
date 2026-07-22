import { app } from 'electron';
import path from 'path';

// storage/cmms/<id>/cmm.pdf
// storage/cmms/<id>/cover.png
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