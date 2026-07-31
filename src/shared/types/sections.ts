export interface SectionRef {
  cmmId: number;
  sectionId: string;
}

export type ToolType = 'Standard' | 'Commercial' | 'Special' | 'General';

export interface Tool {
  name: string;
  pn?: string;
  type: ToolType;
  usedIn?: string;
  calibrated: boolean;
  notes?: string;
}

export interface Consumable {
  code: string;
  description: string;
  spec?: string;
  category?: string;
}

export interface SubTask {
  id: string;
  description: string;
}

export type ExternalManualType = 'SRM' | 'SOPM' | 'AMM' | 'NTM' | 'CMM' | 'IPC' | 'SPEC' | 'OTHER';

export interface ExternalReference {
  manualType: ExternalManualType;
  rawDocNumber: string;
  reason?: string;
  // The page (within THIS document) where the citation itself appears —
  // e.g. if a task spans pages 74-79 but cites an SRM chapter specifically
  // on page 77, this is 77, not the task's own sourcePage.
  sourcePage: number;
}

export interface Task {
  id: string;
  title: string;
  sourcePage: number;
  subTasks: SubTask[];
  tools: Tool[];
  consumables: Consumable[];
  externalReferences: ExternalReference[];
}

export interface ReferencedSectionRef {
  sectionId: string;
  sectionName?: string;
  reason?: string;
}

export interface ReferenceFinderResponse {
  referencedSections: ReferencedSectionRef[];
}

export interface TaskExtractionResponse {
  tasks: Task[];
}

export interface SectionExtractionResult {
  cmmId: number;
  sectionId: string;
  referencedSectionIds: string[];
  tasks: Task[];
}