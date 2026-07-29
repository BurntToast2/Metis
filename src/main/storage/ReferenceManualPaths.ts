import { app } from 'electron';
import path from 'path';

const STORAGE_ROOT = () => path.join(app.getPath('userData'), 'storage', 'reference-manuals');

export function getReferenceManualFolderPath(id: number): string {
  return path.join(STORAGE_ROOT(), String(id));
}

export function getReferenceManualPdfPath(id: number): string {
  return path.join(getReferenceManualFolderPath(id), 'manual.pdf');
}

export function getReferenceManualRawTextPath(id: number): string {
  return path.join(getReferenceManualFolderPath(id), 'raw-text.json');
}

export function getReferenceManualSectionsPath(id: number): string {
  return path.join(getReferenceManualFolderPath(id), 'sections.json');
}