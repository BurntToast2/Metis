import { CMMRecord } from './types/cmm';
import { SectionRef, SectionExtractionResult } from './types/sections';
import { ManualSearchResult } from './types/search';
import { MissingReference, UploadReferenceManualParams } from './types/referenceManuals';
import { TaskRef } from '../main/sections/common/taskReExtraction.service';

export {};

declare global {
  interface Window {
    api: {
      getAllCMMs: () => Promise<CMMRecord[]>;
      createCMM: (data: {
        title: string;
        cmmNumber?: string | null;
        manufacturer?: string | null;
        revision?: string | null;
        revisionDate?: Date | null;
      }) => Promise<CMMRecord>;
      deleteCMM: (id: number) => Promise<{ success: boolean }>;
      getCmmFolderPath: (id: number) => Promise<string>;
      getPathForFile: (file: File) => string;
      toFileUrl: (path: string) => string;
      processNewCmm: (
        filePath: string,
        selectedSectionIds: string[],
      ) => Promise<{ id: number }>;

      getCmmSections: (id: number) => Promise<{ sectionId: string; startPage: number; endPage: number }[]>;
      getCmmSummary: (id: number) => Promise<Record<string, string | number>>;
      ensureCmmSectionPreviews: (id: number) => Promise<{ generated: boolean }>;
      extractTestingTools: (ref: SectionRef) => Promise<SectionExtractionResult>;
      hasExtractedSection: (args: { cmmId: number; sectionId: string }) => Promise<boolean>;
      extractDisassemblyTools: (ref: SectionRef) => Promise<SectionExtractionResult>;
      extractCleaningTools: (ref: SectionRef) => Promise<SectionExtractionResult>;
      extractInspectionTools: (ref: SectionRef) => Promise<SectionExtractionResult>;
      extractRepairsTools: (ref: SectionRef) => Promise<SectionExtractionResult>;
      searchManuals: (query: string) => Promise<ManualSearchResult[]>;
      uploadReferenceManual: (
        params: UploadReferenceManualParams,
      ) => Promise<{ id: number }>;
      getMissingReferences: (args: {
        cmmId: number;
        sectionId: string;
      }) => Promise<MissingReference[]>;
      reExtractTask: (ref: TaskRef) => Promise<SectionExtractionResult>;
    };
  }
}