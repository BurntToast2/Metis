import 'dotenv/config';
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerCMMHandlers } from './ipc/cmm';
import { registerCmmAssetSchemeAsPrivileged, registerCmmAssetProtocolHandler } from './storage/CMMProtocol';

if (started) {
  app.quit();
}

// MUST run at module scope, before app.on('ready')/app.whenReady() fires.
// This is what makes cmm-asset:// behave like a real, secure scheme instead
// of being silently blocked or half-working (see explanation from earlier).
registerCmmAssetSchemeAsPrivileged();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Registers the actual cmm-asset:// request handler. Needs to happen after
  // 'ready' (the session/networking layer needs to exist), and before the
  // window loads content that might request cmm-asset:// URLs.
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

