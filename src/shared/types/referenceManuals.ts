import type { ExternalManualType } from './sections';

// One card's worth of data — a single unresolved key, and every task (in
// the currently-open section) still waiting on it. Deduplicated the same
// way external_references itself is: one row per key, not per task.
// platform is carried through unchanged from the stored reference row so
// upload can pass it straight back to ingestReferenceManual without the
// user re-entering it (and risking a normalization mismatch).
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