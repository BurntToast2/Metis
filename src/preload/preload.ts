import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { pathToFileURL } from 'url';
import type { CMMRecord } from '../shared/types/cmm';
import type { SectionRef, TestingExtractionResult } from '../main/sections/testing/testing.types';


console.log('preload loaded, pathToFileURL:', typeof pathToFileURL);
contextBridge.exposeInMainWorld('api', {
  getAllCMMs: (): Promise<CMMRecord[]> => ipcRenderer.invoke('get-all-cmms'),

  createCMM: (data: {
    title: string;
    cmmNumber?: string | null;
    manufacturer?: string | null;
    revision?: string | null;
    revisionDate?: Date | null;
  }): Promise<CMMRecord> => ipcRenderer.invoke('create-cmm', data),

  deleteCMM: (id: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('delete-cmm', id),

  getCmmFolderPath: (id: number): Promise<string> =>
    ipcRenderer.invoke('get-cmm-folder-path', id),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  toFileUrl: (filePath: string): string =>
  `cmm-asset://asset/preview/${encodeURIComponent(filePath)}`,

  processNewCmm: (
    filePath: string,
    selectedSectionIds: string[],
  ): Promise<{ id: number }> =>
    ipcRenderer.invoke('process-new-cmm', filePath, selectedSectionIds),

  getCmmSections: (id: number) => ipcRenderer.invoke('get-cmm-sections', id),
  getCmmSummary: (id: number) => ipcRenderer.invoke('get-cmm-summary', id),
  ensureCmmSectionPreviews: (id: number) => ipcRenderer.invoke('ensure-cmm-section-previews', id),
  extractTestingTools: (payload: SectionRef): Promise<TestingExtractionResult> =>
    ipcRenderer.invoke('testing:extractTools', payload),
  hasExtractedSection: (args: { cmmId: number; sectionId: string }) =>
  ipcRenderer.invoke('has-extracted-section', args),
});