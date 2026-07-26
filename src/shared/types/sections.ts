// src/shared/types/sections.ts
export interface SectionRef {
  cmmId: number;
  sectionId: string;
}

export interface Tool {
  name: string;
  partNumber?: string;
  quantity?: string;
}

export interface Consumable {
  name: string;
  partNumber?: string;
  quantity?: string;
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