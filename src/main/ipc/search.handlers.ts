import { ipcMain } from 'electron';
import { searchManuals } from '../search/searchManuals'; 

export function registerSearchHandlers(): void {
    ipcMain.handle('search:manuals', (_event, query: string) => searchManuals(query));
}
