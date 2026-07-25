import { ipcMain } from 'electron';
import { runTestingExtraction } from '../sections/testing/testingExtraction.service';
import type { SectionRef } from '../sections/testing/testing.types';

export function registerTestingHandlers(): void {
  ipcMain.handle('testing:extractTools', async (_event, payload: SectionRef) => {
    try {
      return await runTestingExtraction(payload);
    } catch (err) {
      console.error('[testing:extractTools] failed', err);
      throw err; // renderer's invoke() will reject — handle the error state there
    }
  });
}