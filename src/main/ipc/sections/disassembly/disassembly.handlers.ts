import { ipcMain } from 'electron';
import { runDisassemblyExtraction } from '../../../sections/Disassembly/disassemblyExtraction.service';
import type { SectionRef } from '../../../sections/common/section.types';

export function registerDisassemblyHandlers(): void {
  ipcMain.handle('disassembly:extractTools', async (_event, payload: SectionRef) => {
    try {
      return await runDisassemblyExtraction(payload);
    } catch (err) {
      console.error('[disassembly:extractTools] failed', err);
      throw err; // renderer's invoke() will reject — handle the error state there
    }
  });
}