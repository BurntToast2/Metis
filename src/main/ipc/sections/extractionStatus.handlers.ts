import { ipcMain } from 'electron';
import { access } from 'fs/promises';
import { getCmmExtractedSectionPath } from '../../storage/CMMPaths';

const SECTION_EXTRACTION_KIND: Record<string, string> = {
  'testing-fault-isolation': 'testing',
};

export function registerExtractionStatusHandler() {
  ipcMain.handle(
    'has-extracted-section',
    async (_event, { cmmId, sectionId }: { cmmId: number; sectionId: string }) => {
      const kind = SECTION_EXTRACTION_KIND[sectionId];
      if (!kind) return false;

      try {
        await access(getCmmExtractedSectionPath(cmmId, kind, sectionId));
        return true;
      } catch {
        return false;
      }
    },
  );
}