// Desktop wrapper for the toolbox: one window showing app/index.html.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// One copy at a time, so two windows never fight over the same saved data.
if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 380,
    title: 'Useful Toolbox',
    icon: path.join(__dirname, 'app', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

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
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => app.quit());
