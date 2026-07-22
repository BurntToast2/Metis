import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerCMMHandlers } from './ipc/cmm';
import { registerCmmAssetSchemeAsPrivileged, registerCmmAssetProtocolHandler } from './storage/CMMProtocol';

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

