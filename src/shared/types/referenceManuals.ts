import type { ExternalManualType } from './sections';

export interface MissingReference {
  key: string;
  manualType: ExternalManualType;
  rawDocNumber: string;
  platform: string | null;
  taskIds: string[];
}

export interface UploadReferenceManualParams {
  filePath: string;
  manualType: ExternalManualType;
  platform?: string | null;
}