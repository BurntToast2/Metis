import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerCMMHandlers } from './ipc/cmm';
import { registerCmmAssetSchemeAsPrivileged, registerCmmAssetProtocolHandler, } from './storage/CMMProtocol';
import { registerCmmProcessingHandlers } from './ipc/cmmProcessing'; // was './ipc/cmm-Processing'
import { registerEnsureCmmSectionPreviewsHandler } from './ipc/ensureCMMSectionPreview';
import { registerTestingHandlers } from './ipc/sections/testing/testing.handlers';
import { registerExtractionStatusHandler } from './ipc/sections/extractionStatus.handlers';
import { registerDisassemblyHandlers } from './ipc/sections/disassembly/disassembly.handlers';
import { registerSearchHandlers } from './ipc/search.handlers';
import { registerCleaningHandlers } from './ipc/sections/cleaning/cleaning.handlers';

if (started) {
  app.quit();
}

registerCmmAssetSchemeAsPrivileged();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, 
    },
    
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();
  mainWindow.maximize();
  mainWindow.show();
};


app.on('ready', () => {
  registerCmmAssetProtocolHandler();
  registerCMMHandlers();
  registerCmmProcessingHandlers(); 
  registerEnsureCmmSectionPreviewsHandler();
  registerTestingHandlers();
  registerDisassemblyHandlers();
  registerExtractionStatusHandler();
  registerSearchHandlers();
  registerCleaningHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

