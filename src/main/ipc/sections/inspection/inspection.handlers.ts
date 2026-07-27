import { ipcMain } from 'electron';
import { runInspectionExtraction } from '../../../sections/inspection/inspectionExtraction.service';
import type { SectionRef } from '../../../sections/common/section.types';

export function registerInspectionHandlers(): void {
  ipcMain.handle('inspection:extractTools', async (_event, payload: SectionRef) => {
    try {
      return await runInspectionExtraction(payload);
    } catch (err) {
      console.error('[inspection:extractTools] failed', err);
      throw err; // renderer's invoke() will reject — handle the error state there
    }
  });
}