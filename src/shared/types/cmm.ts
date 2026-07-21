export interface CMMRecord {
  id: number;
  title: string;
  cmmNumber: string | null;
  manufacturer: string | null;
  revision: string | null;
  revisionDate: Date | null;
  filePath: string | null;
  uploadedAt: Date | null;
}