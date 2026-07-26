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

export interface Task {
  id: string;
  title: string;
  sourcePage: number;
  subTasks: SubTask[];
  tools: Tool[];
  consumables: Consumable[];
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