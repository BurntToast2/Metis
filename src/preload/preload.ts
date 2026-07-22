import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getAllCMMs: () => ipcRenderer.invoke('get-all-cmms'),
});