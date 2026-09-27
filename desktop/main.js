'use strict';
// Space Goobers desktop app: the same game, in its own window. It keeps the game up to date by
// itself: when a newer version is out, the title screen offers it (see updater.js).
const { app, BrowserWindow, shell, Menu, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { Updater, RELEASES } = require('./updater');

// the game that came with this download (build.json is written when the app is built for a release)
function shippedGame() {
  let b = {};
  try { b = JSON.parse(fs.readFileSync(path.join(__dirname, 'build.json'), 'utf8')); } catch (e) { /* running from the source */ }
  return { version: b.version || app.getVersion(), build: b.build || 'dev', time: b.time || '', title: b.title || '' };
}

let win = null, updater = null, game = null, readyT = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Space Goobers',
    backgroundColor: '#07090f',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.once('ready-to-show', () => win.show());
  // links (like the GitHub page) open in the normal browser, not inside the game
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
  // F11 = fullscreen, like most games
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // a downloaded game that won't load or crashes: go back to the one that came with the app
  win.webContents.on('did-fail-load', (e, code, desc, url, mainFrame) => { if (mainFrame && code !== -3) gameFailed(desc || 'it would not load'); });
  win.webContents.on('render-process-gone', (e, d) => { if (d.reason !== 'clean-exit') gameFailed(d.reason); });
  win.on('closed', () => { win = null; clearTimeout(readyT); });
  loadGame();
}

// start the newest game we have that works
function loadGame() {
  if (!win) return;
  game = updater.current();
  clearTimeout(readyT);
  // (a downloaded game gets a minute to reach its title screen)
  if (game.downloaded) readyT = setTimeout(() => gameFailed('it did not start'), 60000);
  win.loadFile(path.join(game.dir, 'index.html'));
}
function gameFailed(why) {
  clearTimeout(readyT);
  if (!game || !game.downloaded || !win) return;
  console.warn(`Space Goobers ${game.version} (${game.build}) didn't start (${why}); going back to ${updater.shipped.version}.`);
  updater.markBad(game);
  loadGame();
}

// only an installed app updates itself (SPACE_GOOBERS_UPDATES=<game.json address> tries it out from the source)
const canUpdate = () => app.isPackaged || !!process.env.SPACE_GOOBERS_UPDATES;
const fromGame = (e) => win && e.sender === win.webContents;
ipcMain.on('game:ready', (e) => { if (fromGame(e)) clearTimeout(readyT); });
ipcMain.on('game:failed', (e, why) => { if (fromGame(e)) gameFailed(String(why).slice(0, 200)); });
ipcMain.handle('update:check', (e) => (fromGame(e) && canUpdate() ? updater.check() : { status: 'off' }));
ipcMain.handle('update:install', async (e) => {
  if (!fromGame(e) || !canUpdate()) return { ok: false, error: 'updates are off' };
  try {
    await updater.install((p) => { if (!e.sender.isDestroyed()) e.sender.send('update:progress', p); });
    setTimeout(loadGame, 600); // restart the game on the new version
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.on('update:releases', (e, v) => { if (fromGame(e)) shell.openExternal(/^\d+(\.\d+)*$/.test(v) ? `${RELEASES}/tag/v${v}` : `${RELEASES}/latest`); });

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  updater = new Updater({
    shippedDir: path.join(__dirname, '..'),
    shipped: shippedGame(),
    dataDir: path.join(app.getPath('userData'), 'game'),
    fetch: (url, opts) => net.fetch(url, Object.assign({ cache: 'no-store' }, opts)),
    manifestUrl: app.isPackaged ? undefined : process.env.SPACE_GOOBERS_UPDATES,
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
