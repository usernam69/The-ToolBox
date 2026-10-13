// Desktop wrapper for the toolbox: one window showing app/index.html.
const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron');
const path = require('path');
const { createLanServer } = require('./lan-server');

const APP_DIR = path.join(__dirname, 'app');
let lan = null;

// One copy at a time, so two windows never fight over the same saved data.
if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 380,
    title: 'Useful Toolbox',
    icon: path.join(APP_DIR, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true, preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile(path.join(APP_DIR, 'index.html'));

  // Web links (saved links, help pages) open in the normal browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:/i.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  // Microphone (voice commands) and clipboard reading are the only permissions the page asks for.
  win.webContents.session.setPermissionRequestHandler((_wc, perm, cb) =>
    cb(['media', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(perm)));
  return win;
}

app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows();
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
// Home-network server for chat / drawing, started only when a page asks to host.
ipcMain.handle('lan:start', async () => {
  if (!lan) lan = createLanServer(APP_DIR);
  return lan.start(8765);
});
app.on('before-quit', () => lan && lan.stop());

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => app.quit());
