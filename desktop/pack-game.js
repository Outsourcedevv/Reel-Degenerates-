'use strict';
// Release helper for the desktop app's updates (see updater.js):
//   node desktop/pack-game.js --stamp        writes desktop/build.json: which game ships inside the app
//   node desktop/pack-game.js --bundle DIR   writes DIR/game.json and the game bundle it points to
// Both give the same version, build (the commit) and time for the same commit, so a freshly
// installed app doesn't offer the game it already has.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { SHELL, RELEASES, readGame, packGame, sha256 } = require('./updater');

const root = path.join(__dirname, '..');
const git = (args) => { try { return execSync(`git ${args}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return ''; } };
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const build = (process.env.GITHUB_SHA || git('rev-parse HEAD') || 'local').slice(0, 10);
const when = git('log -1 --format=%cI');
const time = new Date(when || Date.now()).toISOString();
// the headline of the newest release notes ("New in 1.9: ..."), shown with the update
const notes = fs.readFileSync(path.join(__dirname, 'RELEASE_NOTES.md'), 'utf8').match(/^## (.+)$/m);
const title = notes ? notes[1].trim() : '';

const [mode, dir] = process.argv.slice(2);
if (mode === '--stamp') {
  fs.writeFileSync(path.join(__dirname, 'build.json'), JSON.stringify({ version, build, time, title }, null, 1) + '\n');
  console.log(`desktop/build.json: ${version} (${build}, ${time})`);
} else if (mode === '--bundle' && dir) {
  const files = readGame(root), gz = packGame(files);
  const file = `space-goobers-game-${version}-${build}.gz`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), gz);
  const manifest = { version, build, time, title, shell: SHELL, url: `${RELEASES}/download/v${version}/${file}`, size: gz.length, sha256: sha256(gz), files: Object.keys(files).length };
  fs.writeFileSync(path.join(dir, 'game.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(`${file}: ${manifest.files} files, ${(gz.length / 1024).toFixed(0)} KB`);
} else {
  console.error('usage: node desktop/pack-game.js --stamp | --bundle DIR');
  process.exit(1);
}
