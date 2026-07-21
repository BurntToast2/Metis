import { ipcMain } from 'electron';
import { db } from '../db';
import { cmms } from '../db/schema';

export function registerCMMHandlers() {
  ipcMain.handle('get-all-cmms', async () => {
    return await db.select().from(cmms);
  });
}