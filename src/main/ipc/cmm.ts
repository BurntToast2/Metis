import { ipcMain } from 'electron';
import { db } from '../db';
import { cmms } from '../db/schema';
import { readFile } from 'fs/promises';
import { getCmmSectionsPath, getCmmSummaryPath } from '../storage/CMMPaths';

export function registerCMMHandlers() {
  ipcMain.handle('get-all-cmms', async () => {
    return await db.select().from(cmms);
  });

  ipcMain.handle('get-cmm-sections', async (_event, id: number) => {
  const raw = await readFile(getCmmSectionsPath(id), 'utf-8');
  return JSON.parse(raw);
});

ipcMain.handle('get-cmm-summary', async (_event, id: number) => {
  const raw = await readFile(getCmmSummaryPath(id), 'utf-8');
  return JSON.parse(raw);
});
}

