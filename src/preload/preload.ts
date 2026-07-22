import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { CMMRecord } from '../shared/types/cmm';

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

  // File objects from <input type="file"> or drag-and-drop don't carry a
  // usable filesystem path directly (the old File.path is deprecated).
  // webUtils.getPathForFile is the current Electron-recommended way to
  // resolve one, and it only works from the preload/main side, not the
  // renderer directly — hence exposing it here.
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
});