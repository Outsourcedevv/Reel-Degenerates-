'use strict';
// The little bit of the desktop app the game can talk to: updates (see updater.js), telling the app
// the game started fine (or didn't), fullscreen and quitting. In a browser there's no window.desktop.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  ready: () => ipcRenderer.send('game:ready'),
  failed: (why) => ipcRenderer.send('game:failed', String(why || '')),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onProgress: (cb) => {
    ipcRenderer.removeAllListeners('update:progress');
    ipcRenderer.on('update:progress', (_e, p) => cb(p));
  },
  openReleases: (version) => ipcRenderer.send('update:releases', String(version || '')),
  // the game wants the mouse back (see Game.lockFailed): the app clicks in the middle of the window for it
  grabMouse: () => ipcRenderer.send('game:grab-mouse'),
  // Options: fullscreen or windowed (onDisplay: it changed, like with F11)
  isFullscreen: () => ipcRenderer.invoke('display:get'),
  setFullscreen: (on) => ipcRenderer.send('display:set', !!on),
  onDisplay: (cb) => {
    ipcRenderer.removeAllListeners('display:changed');
    ipcRenderer.on('display:changed', (_e, on) => cb(!!on));
  },
  // Quit Game (title screen) / Quit to Desktop (pause menu)
  quit: () => ipcRenderer.send('app:quit'),
});
