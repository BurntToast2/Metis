import { ipcMain } from 'electron';
import { runRepairsExtraction } from '../../../sections/repairs/repairsExtraction.service';
import type { SectionRef } from '../../../sections/common/section.types';

export function registerRepairsHandlers(): void {
  ipcMain.handle('repairs:extractTools', async (_event, payload: SectionRef) => {
    try {
      return await runRepairsExtraction(payload);
    } catch (err) {
      console.error('[repairs:extractTools] failed', err);
      throw err; // renderer's invoke() will reject — handle the error state there
    }
  });
}