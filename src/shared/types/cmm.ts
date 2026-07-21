export interface CMMRecord {
  id: string;
  name: string;
  description: string;
  manufacturer?: string;
  filePath: string;       // path to the original PDF
  thumbnailPath?: string; // path to generated cover image 
  createdAt: string;
  updatedAt: string;
}