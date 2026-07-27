import { ipcMain } from 'electron';
import { runCleaningExtraction } from '../../../sections/cleaning/cleaningExtraction.service';
import type { SectionRef } from '../../../sections/common/section.types';

export function registerCleaningHandlers(): void {
  ipcMain.handle('cleaning:extractTools', async (_event, payload: SectionRef) => {
    try {
      return await runCleaningExtraction(payload);
    } catch (err) {
      console.error('[cleaning:extractTools] failed', err);
      throw err; // renderer's invoke() will reject — handle the error state there
    }
  });
}