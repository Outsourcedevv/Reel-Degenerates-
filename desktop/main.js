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

// the window, the way you left it: fullscreen (how it starts the first time, like most games) or windowed
const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
function loadPrefs() {
  try { return Object.assign({ fullscreen: true }, JSON.parse(fs.readFileSync(prefsFile(), 'utf8'))); } catch (e) { return { fullscreen: true }; }
}
function savePrefs(p) {
  try { fs.writeFileSync(prefsFile(), JSON.stringify(p)); } catch (e) { /* not the end of the world */ }
}
let prefs = { fullscreen: true };
function setFullscreen(on) {
  if (!win) return;
  win.setFullScreen(!!on);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    fullscreen: !!prefs.fullscreen,
    title: 'Space Goobers',
    backgroundColor: '#07090f',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, spellcheck: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.once('ready-to-show', () => win.show());
  // links (like the GitHub page) open in the normal browser, not inside the game. Nothing else ever replaces the
  // game in its window: a file dropped on it, say, would otherwise open in place of the game
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); });
  // a game, not a web page: no zooming in and out
  Promise.resolve(win.webContents.setVisualZoomLevelLimits(1, 1)).catch(() => {});
  win.webContents.on('did-finish-load', () => win && win.webContents.setZoomFactor(1));
  // F11 or Alt+Enter = fullscreen / windowed, like most games (Options in the game does it too). Cmd+Q on a Mac
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt && !input.control && !input.meta)) { setFullscreen(!win.isFullScreen()); e.preventDefault(); }
    else if (process.platform === 'darwin' && input.meta && input.key.toLowerCase() === 'q') { e.preventDefault(); app.quit(); }
  });
  // remember it for next time, and tell the game (its Options screen shows which it is)
  const display = () => {
    if (!win) return;
    prefs.fullscreen = win.isFullScreen();
    savePrefs(prefs);
    if (!win.webContents.isDestroyed()) win.webContents.send('display:changed', prefs.fullscreen);
  };
  win.on('enter-full-screen', display);
  win.on('leave-full-screen', display);
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
// the game let go of the mouse (Esc does that) and wants it back. Chromium only grabs it again after a real click or
// key press, and Esc doesn't count, so the game used to sit there saying "Click to look around". The app clicks in
// the middle of the window for it instead: a real click as far as Chromium's concerned, so the mouse is grabbed
// straight back. (The game ignores that click for anything else: it can't shoot, see Input.loose.)
ipcMain.on('game:grab-mouse', (e) => {
  if (!fromGame(e) || !win || !win.isFocused()) return;
  const [w, h] = win.getContentSize(), x = Math.round(w / 2), y = Math.round(h / 2);
  e.sender.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
  e.sender.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
});
// Options in the game: fullscreen or windowed. Quit Game / Quit to Desktop: close the app
ipcMain.handle('display:get', (e) => (fromGame(e) ? win.isFullScreen() : false));
ipcMain.on('display:set', (e, on) => { if (fromGame(e)) setFullscreen(on); });
ipcMain.on('app:quit', (e) => { if (fromGame(e)) app.quit(); });
ipcMain.on('update:releases', (e, v) => { if (fromGame(e)) shell.openExternal(/^\d+(\.\d+)*$/.test(v) ? `${RELEASES}/tag/v${v}` : `${RELEASES}/latest`); });

// one copy of the game at a time: starting it again just brings the one that's running to the front
const first = app.requestSingleInstanceLock();
if (!first) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
// the title screen's music can start before you've clicked anything (a web page has to wait for a click)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  if (!first) return;
  prefs = loadPrefs();
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
