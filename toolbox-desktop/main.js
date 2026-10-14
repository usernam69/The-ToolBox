// Desktop wrapper for the toolbox: one window showing app/index.html.
const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
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
  const win = createWindow();
  setTimeout(() => checkForUpdate(win), 5000);
});

// Once a day, ask GitHub for the newest release and offer to download it (nothing is installed by itself).
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
async function checkForUpdate(win) {
  const fs = require('fs'), stamp = path.join(app.getPath('userData'), 'update-check.json');
  let seen = {}; try { seen = JSON.parse(fs.readFileSync(stamp, 'utf8')); } catch {}
  if (Date.now() - (seen.at || 0) < 864e5) return;
  try {
    const r = await fetch('https://api.github.com/repos/usernam69/The-ToolBox/releases/latest', { headers: { 'User-Agent': 'TheToolBox' } });
    if (!r.ok) return;
    const rel = await r.json(), latest = String(rel.tag_name || '').replace(/^v/, '');
    fs.writeFileSync(stamp, JSON.stringify({ at: Date.now(), skipped: seen.skipped }));
    if (!/^\d+\.\d+\.\d+$/.test(latest) || !newer(latest, app.getVersion()) || seen.skipped === latest) return;
    const { response } = await dialog.showMessageBox(win, { type: 'info', title: 'Update available', message: `The ToolBox ${latest} is out (you have ${app.getVersion()}).`,
      detail: 'Download the new UsefulToolbox.exe and replace this one. Your data stays where it is.', buttons: ['Download', 'Later', 'Skip this version'], defaultId: 0, cancelId: 1 });
    if (response === 0) shell.openExternal(rel.html_url);
    if (response === 2) fs.writeFileSync(stamp, JSON.stringify({ at: Date.now(), skipped: latest }));
  } catch {}
}
app.on('window-all-closed', () => app.quit());
