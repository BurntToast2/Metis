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

// A citation to a manual OUTSIDE this CMM's own document — e.g. "Refer to
// SRM 53-30-01". rawDocNumber is kept exactly as printed; normalization
// into a lookup key happens downstream (main/common/referenceKey.ts),
// never here, since this type is shared with the renderer and shouldn't
// carry main-process-specific logic.
export interface ExternalReference {
  manualType: ExternalManualType;
  rawDocNumber: string;
  reason?: string;
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