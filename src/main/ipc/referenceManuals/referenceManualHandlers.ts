import { ipcMain } from 'electron';
import { ingestReferenceManual } from '../../sections/referenceManuals/referenceManualIngestion.service';
import { reExtractSingleTask } from '../../sections/common/taskReExtraction.service';
import type { TaskRef } from '../../sections/common/taskReExtraction.service';
import { getMissingReferencesForSection } from '../../sections/common/missingReferences.query';
import type { UploadReferenceManualParams } from '../../../shared/types/referenceManuals';

export function registerReferenceManualHandlers(): void {
  ipcMain.handle(
    'reference-manuals:upload',
    async (_event, payload: UploadReferenceManualParams) => {
      try {
        return await ingestReferenceManual({
          uploadedFilePath: payload.filePath,
          manualType: payload.manualType,
          platform: payload.platform ?? null,
        });
      } catch (err) {
        console.error('[reference-manuals:upload] failed', err);
        throw err;
      }
    },
  );

  ipcMain.handle(
    'reference-manuals:get-missing',
    async (_event, { cmmId, sectionId }: { cmmId: number; sectionId: string }) => {
      try {
        return await getMissingReferencesForSection(cmmId, sectionId);
      } catch (err) {
        console.error('[reference-manuals:get-missing] failed', err);
        throw err;
      }
    },
  );

  ipcMain.handle('reference-manuals:re-extract-task', async (_event, payload: TaskRef) => {
    try {
      return await reExtractSingleTask(payload);
    } catch (err) {
      console.error('[reference-manuals:re-extract-task] failed', err);
      throw err;
    }
  });
}