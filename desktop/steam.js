'use strict';
// Steam: achievements and the Steam overlay (Shift+Tab), through steamworks.js. Only switched on once the game's
// Steam App ID is in desktop/steam.json (or Steam launched the game, which tells us its App ID). Without Steam
// running, or with no App ID, the app works exactly as before: the game keeps its own list of achievements.
//
//   desktop/steam.json: { "appId": 0, "requireSteam": false }
//     appId         the game's App ID from the Steamworks partner site (480, Valve's "Spacewar", to test with)
//     requireSteam  true: a copy started outside Steam restarts through Steam (for the Steam release only: a
//                   download from GitHub with this on would keep opening Steam)
const fs = require('fs');
const path = require('path');

let sw = null, client = null, appId = 0, cfg = {};

function readConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'steam.json'), 'utf8')) || {}; } catch (e) { return {}; }
}
// Steam started us (from the library): it sets these for the game it launches. (Read now, before init: connecting
// to Steam sets them too, even when it fails)
const BY_STEAM = !!(process.env.SteamGameId || process.env.SteamAppId || process.env.SteamOverlayGameId);
const launchedBySteam = () => BY_STEAM;

// before the app is ready: load steamworks.js and switch on what the overlay needs (it draws over the game in the
// same process as the GPU, see electronEnableSteamOverlay). false: the game should quit, Steam is starting it again
function prepare() {
  cfg = readConfig();
  appId = Number(process.env.SteamAppId) || Number(cfg.appId) || 0;
  if (!appId) return true;
  try { sw = require('steamworks.js'); } catch (e) { console.warn('Steam: steamworks.js did not load:', e.message); sw = null; return true; }
  if (cfg.requireSteam && !launchedBySteam()) {
    try { if (sw.restartAppIfNecessary(appId)) return false; } catch (e) { /* no Steam here: carry on without it */ }
  }
  // (only when Steam starts the game: the overlay's settings cost a little speed, and it's not there otherwise)
  if (launchedBySteam()) {
    try { sw.electronEnableSteamOverlay(); } catch (e) { console.warn('Steam: no overlay:', e.message); }
  }
  return true;
}

// once the app is ready: talk to Steam (it has to be running, and the account has to own the game)
function start() {
  if (!sw || !appId) return false;
  try { client = sw.init(appId); } catch (e) { console.warn('Steam: not connected (' + e.message + '). Playing without it.'); client = null; }
  return !!client;
}

const safe = (fn, dflt) => { try { return fn(); } catch (e) { return dflt; } };
const okName = (n) => typeof n === 'string' && /^[A-Z0-9_]{1,64}$/.test(n);

module.exports = {
  prepare,
  start,
  launchedBySteam,
  active: () => !!client,
  // what the game gets to know: are we on Steam, and your Steam name (for your goober's default name)
  info: () => (client ? { on: true, appId, name: safe(() => client.localplayer.getName(), ''), deck: safe(() => client.utils.isSteamRunningOnSteamDeck(), false) } : { on: false }),
  // unlock an achievement (its API name, as set up on the Steamworks site). Steam shows its own pop-up.
  achieve(name) {
    if (!client || !okName(name)) return false;
    const ok = safe(() => client.achievement.activate(name), false);
    safe(() => client.stats.store(), false); // (saved to Steam straight away)
    return ok;
  },
  // which of these you have on Steam
  has: (names) => (Array.isArray(names) ? names.slice(0, 200).map((n) => !!client && okName(n) && safe(() => client.achievement.isActivated(n), false)) : []),
  // the Steam overlay's achievements page
  showAchievements: () => { if (client) safe(() => client.overlay.activateDialog(6), null); },
};
