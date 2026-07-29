import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { cmms, taskReferenceLinks } from '../db/schema';
import { getCmmFolderPath } from '../storage/CMMPaths';

export async function deleteCmm(id: number): Promise<{ success: boolean }> {
  await db.delete(taskReferenceLinks).where(eq(taskReferenceLinks.cmmId, id));

  await db.delete(cmms).where(eq(cmms.id, id));

  const folderPath = getCmmFolderPath(id);
  await fs.rm(folderPath, { recursive: true, force: true });

  return { success: true };
}

export function registerCmmDeletionHandlers(): void {
  ipcMain.handle('delete-cmm', async (_event, id: number) => {
    try {
      return await deleteCmm(id);
    } catch (err) {
      console.error('[delete-cmm] failed', err);
      throw err;
    }
  });
}