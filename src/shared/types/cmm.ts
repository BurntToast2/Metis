export interface CMMRecord {
  id: number;
  title: string;
  cmmNumber: string | null;
  manufacturer: string | null;
  revision: string | null;
  revisionDate: Date | null;
  filePath: string | null;
  uploadedAt: Date | null;
  // Aircraft applicability, e.g. "737-800". Used to disambiguate
  // platform-scoped external references (SRM/AMM/NTM) that reuse the same
  // ATA chapter numbers across different aircraft. Null on CMMs uploaded
  // before this field existed, or where the front matter didn't state it.
  platform: string | null;
}