import type { ExternalManualType } from './sections';

export interface MissingReference {
  key: string;
  manualType: ExternalManualType;
  rawDocNumber: string;
  platform: string | null;
  taskIds: string[];
  sourcePages: number[]; // one per taskId, same index order
}

export interface UploadReferenceManualParams {
  filePath: string;
  manualType: ExternalManualType;
  platform?: string | null;
}