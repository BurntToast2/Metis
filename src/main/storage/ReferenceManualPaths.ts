import { app } from 'electron';
import path from 'path';

// storage/reference-manuals/<id>/manual.pdf
// storage/reference-manuals/<id>/raw-text.json
// storage/reference-manuals/<id>/sections.json
//
// Mirrors CMMPaths.ts exactly: a reference manual's own chapter map
// (sections.json) and full text (raw-text.json) live on disk the same
// way a CMM's do — no cover image or summary.json, since these manuals
// are never browsed in a library view, only looked up by key.
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