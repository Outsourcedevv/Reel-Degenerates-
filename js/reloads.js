'use strict';
/* =========================================================
   Reloading, gun by gun, the way you see it in your hands.
   Every gun has its own routine: the Storm Caller's battery
   gets flicked out and a fresh one slammed in, the Scattergun
   takes two shells and a pump, the Jackpot Blaster's lever
   gets yanked (and its reels spin), the Squirt Pistol's cap
   comes off for a refill... Worked out fresh every frame from
   how far through the reload you are (GunReload.pose), from
   keyframes for the gun (tipped and brought in, so you can
   see what's going on), your left hand (off the barrel, or up
   from below on a one-handed gun) and the gun's own moving
   bits (see `moving` in gun-designs.js).
   ========================================================= */

// your left hand's pose: reaching over the top of the gun (the arm comes in from the left), or from underneath
// (the arm hangs down out of sight)
const RL_TOP = [0.3, -1.1, 0.15], RL_LOW = [0.8, 0, 0];
// where your left hand waits out of sight on a one-handed gun (and where it goes to fetch a new battery)
const RL_OFF = [-0.3, -0.62, 0.02, ...RL_LOW];
const RL_REST = [0, 0, 0, 0, 0, 0];

/* Each gun's routine. u: how far through the reload (0-1).
   gun: keyframes [u, rx, ry, rz (tipped up, turned left, rolled left), x, y, z (moved), ease]
   hand: keyframes [u, x, y, z, rx, ry, rz, ease] on the gun, or [u, 'home', dx, dy, dz, ease] (on the barrel it
     holds, or out of sight)
   ease: 'i' speeding up into it (a slam), 'o' fast off the mark, 'l' steady; otherwise easing in and out
   mag: the gun's `mag` part. carry: [[from, to, anchor]]: it rides in your hand (it's back in the gun wherever
     your hand is at `anchor`) · hide: [[from, to]] · toss: the old one flying off (at t, v: how fast, spin, g:
     gravity, until)
   sfx: [[u, sound]] · rest(P, S): how its moving bits sit when it's not reloading · extra(u, P, S): anything
   else (P: its moving parts, S: { hand, home, fill (how full it is, 0-1), dur (how long the reload takes),
   t (the time), vm }) */
const GUN_RELOADS = {
  bolt: { // Pew Pew Zapper: roll it over, smack it on the bottom (twice: its power cells light up), then a twirl
    gun: [[0, ...RL_REST], [0.12, 0.1, 0.15, -0.75, -0.06, 0.05, 0.02, 'o'], [0.3, 0.1, 0.15, -0.75, -0.06, 0.05, 0.02],
      [0.33, 0.16, 0.15, -0.62, -0.06, 0.068, 0.02, 'i'], [0.4, 0.1, 0.15, -0.75, -0.06, 0.05, 0.02],
      [0.47, 0.16, 0.15, -0.62, -0.06, 0.068, 0.02, 'i'], [0.54, 0.1, 0.15, -0.75, -0.06, 0.05, 0.02],
      [0.62, 0.1, 0.15, -0.75, -0.06, 0.05, 0.02], [0.86, 0.04, 0, -Math.PI * 2, 0, 0.015, 0, 'o'], [1, 0, 0, -Math.PI * 2, 0, 0, 0]],
    hand: [[0, 'home'], [0.16, 'home'], [0.28, -0.03, -0.16, 0.01, ...RL_LOW], [0.33, -0.02, -0.075, 0, ...RL_LOW, 'i'],
      [0.4, -0.03, -0.15, 0.02, ...RL_LOW], [0.47, -0.02, -0.075, -0.02, ...RL_LOW, 'i'], [0.54, -0.04, -0.17, 0.03, ...RL_LOW],
      [0.66, 'home', 'o']],
    sfx: [[0.03, 'fizz'], [0.33, 'slap'], [0.34, 'charge'], [0.47, 'slap'], [0.48, 'charge'], [0.66, 'whoosh']],
    rest(P, S) { rlCells(P.cells, S.fill, 0); },
    extra(u, P, S) { // (drained, then two cells light up with each smack)
      const level = u < 0.1 ? S.fill * (1 - u / 0.1) : u < 0.33 ? 0 : u < 0.47 ? 0.5 : 1;
      const pop = u >= 0.47 ? Math.exp(-(u - 0.47) * S.dur * 9) : u >= 0.33 ? Math.exp(-(u - 0.33) * S.dur * 9) : 0;
      rlCells(P.cells, level, pop);
    },
  },
  squirt: { // Squirt Pistol: unscrew the cap, the bottle glugs back up full, screw it back on, give it a shake
    gun: [[0, ...RL_REST], [0.12, 0.3, 0.25, 0.35, -0.08, 0.03, 0.02, 'o'], [0.86, 0.3, 0.25, 0.35, -0.08, 0.03, 0.02],
      [0.9, 0.24, 0.25, 0.35, -0.08, 0, 0.02, 'i'], [0.93, 0.33, 0.25, 0.35, -0.08, 0.045, 0.02], [0.96, 0.25, 0.25, 0.35, -0.08, 0.01, 0.02, 'i'],
      [1, ...RL_REST]],
    hand: [[0, 'home'], [0.1, 'home'], [0.2, -0.01, 0.215, 0.018, ...RL_TOP], [0.42, -0.01, 0.215, 0.018, ...RL_TOP],
      [0.5, -0.12, 0.28, 0.0, ...RL_TOP], [0.7, -0.12, 0.28, 0.0, ...RL_TOP], [0.76, -0.01, 0.24, 0.018, ...RL_TOP],
      [0.8, -0.01, 0.215, 0.018, ...RL_TOP], [0.88, -0.01, 0.215, 0.018, ...RL_TOP], [0.97, 'home']],
    sfx: [[0.22, 'unscrew'], [0.29, 'unscrew'], [0.36, 'unscrew'], [0.44, 'pop'], [0.52, 'blub'], [0.6, 'blub'], [0.68, 'blub'],
      [0.81, 'click'], [0.87, 'click'], [0.9, 'wade'], [0.96, 'wade']],
    rest(P, S) { rlWater(P.water, S.fill, 0); },
    extra(u, P, S) {
      // the cap: unscrewed (spinning up off its thread), carried off to the side, screwed back on
      const cap = P.cap, off = u < 0.42 ? 0 : u < 0.8 ? 1 : 1 - rlEase((u - 0.8) / 0.08), un = rlEase((u - 0.22) / 0.2);
      cap.rotation.y = -Math.PI * 6 * (un - (u > 0.8 ? rlEase((u - 0.8) / 0.08) : 0));
      cap.position.y += 0.012 * (u < 0.8 ? un : off);
      if (u >= 0.42 && u <= 0.8) cap.position.add(rlCarry(S, u, 0.2, _rlV));
      if ((u > 0.22 && u < 0.42) || (u > 0.8 && u < 0.88)) S.hand.rotation.y += 0.35 * Math.sin(u * S.dur * 28); // (twisting)
      // the water: glugging back up to full (sloshing about), and sloshing when it's shaken
      const lvl = U.lerp(S.fill, 1, rlEase((u - 0.5) / 0.22));
      rlWater(P.water, lvl, (u > 0.5 && u < 0.75 ? 1 : 0) + (u > 0.88 ? 1.5 : 0), S.t);
    },
  },
  jackpot: { // Jackpot Blaster: yank the lever, the reels spin... and stop, one, two, three. Ding!
    gun: [[0, ...RL_REST], [0.1, 0.1, -0.3, 0.45, -0.07, 0.03, 0.02, 'o'], [0.5, 0.1, -0.3, 0.45, -0.07, 0.03, 0.02],
      [0.53, 0.14, -0.3, 0.48, -0.07, 0.04, 0.02, 'o'], [0.6, 0.1, -0.3, 0.45, -0.07, 0.03, 0.02], [0.84, 0.1, -0.3, 0.45, -0.07, 0.03, 0.02], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.1, 'home'], [0.22, 0.107, 0.204, 0.074, ...RL_TOP], [0.5, 0.107, 0.088, 0.178, ...RL_TOP],
      [0.56, 0.0, 0.22, 0.12, ...RL_TOP, 'o'], [0.72, 'home']],
    sfx: [[0.22, 'click'], [0.26, 'lever'], [0.5, 'spin'], [0.64, 'reelstop'], [0.71, 'reelstop'], [0.78, 'reelstop'], [0.82, 'ding']],
    extra(u, P, S) {
      // the lever: pulled all the way down, then it springs back (wobbling)
      const s = (u - 0.5) * S.dur, a = u < 0.25 ? 0 : u < 0.5 ? 1.45 * rlEaseIn((u - 0.25) / 0.25) : 1.45 * Math.exp(-s * 8) * Math.cos(s * 16);
      P.lever.rotation.x = a;
      if (u >= 0.22 && u <= 0.5) { // (your hand on the knob, all the way down)
        const k = Math.max(a, 0), y = 0.117 * Math.cos(k) - 0.013 * Math.sin(k), z = 0.117 * Math.sin(k) + 0.013 * Math.cos(k);
        S.hand.position.set(P.lever.position.x - 0.007, P.lever.position.y + y + 0.005, P.lever.position.z + z);
      }
      // the reels: a blur while they spin, then each one stops with a bounce
      for (const c of P.reels.children) {
        const i = +c.name.slice(-1), stop = 0.64 + i * 0.07;
        if (u < 0.5) continue;
        if (u < stop) { const f = (u * S.dur * 7 + i * 0.37) % 1; c.position.y = (0.5 - f) * 0.05; c.scale.y = 0.4; } else c.position.y = 0.008 * Math.exp(-(u - stop) * S.dur * 14) * Math.cos((u - stop) * S.dur * 40);
      }
    },
  },
  homing: { // Wisp Caller: the old ghost wriggles out and floats off, a spooky wave of your hand... and a new one pops in
    gun: [[0, ...RL_REST], [0.15, 0.2, 0.45, 0.15, -0.08, 0.05, 0.03, 'o'], [0.85, 0.2, 0.45, 0.15, -0.08, 0.05, 0.03], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.2, 'home'], [0.32, -0.05, 0.32, -0.15, ...RL_TOP], [0.56, -0.05, 0.32, -0.15, ...RL_TOP],
      [0.62, -0.03, 0.25, -0.15, ...RL_TOP, 'i'], [0.66, -0.04, 0.29, -0.15, ...RL_TOP], [0.7, -0.03, 0.25, -0.15, ...RL_TOP, 'i'],
      [0.74, -0.05, 0.3, -0.15, ...RL_TOP], [0.86, 'home']],
    sfx: [[0.06, 'boo'], [0.5, 'ghost'], [0.62, 'tap'], [0.7, 'tap']],
    rest(P, S) { rlGhostBob(P.ghost, S.t); },
    extra(u, P, S) {
      const g = P.ghost;
      if (u < 0.28) { // the old one: squeezing out of the lantern and floating off
        const k = rlEase((u - 0.03) / 0.25);
        rlGhostBob(g, S.t);
        g.scale.setScalar(Math.max(0.001, (1 - k) * (1 + 0.15 * Math.sin(u * S.dur * 30))));
        g.position.y += 0.1 * k; g.rotation.y += 5 * k;
      } else if (u < 0.5) g.visible = false;
      else { // the new one: pops in, spinning, and wobbles into shape
        const s = (u - 0.5) * S.dur, grow = Math.min(1, s / 0.12);
        rlGhostBob(g, S.t);
        g.scale.setScalar(Math.max(0.001, grow * (1 + 0.3 * Math.exp(-s * 5) * Math.cos(s * 16))));
        g.rotation.y += Math.PI * 4 * (1 - Math.exp(-s * 5));
      }
      if (u > 0.32 && u < 0.56) { // (your hand over the lantern, doing something spooky)
        const s = (u - 0.32) * S.dur;
        S.hand.position.x += 0.03 * Math.cos(s * 9); S.hand.position.z += 0.03 * Math.sin(s * 9); S.hand.rotation.z += 0.3 * Math.sin(s * 13);
      }
    },
  },
  spread: { // Scrap Scattergun: roll it over, thumb two shells in underneath, roll it back and rack the pump
    gun: [[0, ...RL_REST], [0.12, 0.05, 0.25, -1.0, -0.06, 0.06, 0.02, 'o'], [0.6, 0.05, 0.25, -1.0, -0.06, 0.06, 0.02],
      [0.68, 0.05, 0.1, 0.05, -0.02, 0.02, 0, 'o'], [0.74, 0.16, 0.1, 0.05, -0.02, 0.03, 0.02, 'o'], [0.82, 0.08, 0.1, 0.03, -0.02, 0.015, -0.01, 'i'],
      [0.9, 0.02, 0.04, 0, -0.01, 0.005, 0], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.1, -0.05, -0.14, -0.12, ...RL_LOW], [0.2, ...RL_OFF], [0.3, 0, -0.12, -0.06, ...RL_LOW],
      [0.38, 0, -0.05, -0.085, ...RL_LOW, 'i'], [0.44, -0.04, -0.17, -0.04, ...RL_LOW], [0.5, 0, -0.12, -0.06, ...RL_LOW],
      [0.58, 0, -0.05, -0.085, ...RL_LOW, 'i'], [0.66, 'home'], [0.74, 'home', 0, 0, 0.09, 'o'], [0.82, 'home', 0, 0, 0, 'i']],
    sfx: [[0.1, 'click'], [0.37, 'shell'], [0.57, 'shell'], [0.74, 'pump'], [0.82, 'pumpin']],
    extra(u, P, S) {
      // a shell in your fingers, pushed up into the loading port
      const sh = rlShell(S.vm);
      sh.visible = (u >= 0.2 && u < 0.38) || (u >= 0.44 && u < 0.58);
      if (sh.visible) sh.position.copy(S.hand.position).add(_rlV.set(0.03, 0.035, -0.01));
      // the pump rides back and forward with your hand
      if (u > 0.66) P.pump.position.z += S.hand.position.z - S.home[2];
    },
  },
  lob: { // Goo Lobber: yank the goo tank off the top and chuck it, slam a full one on (it wobbles like jelly)
    gun: [[0, ...RL_REST], [0.13, 0.05, 0.3, 0.25, -0.06, 0.02, 0.03, 'o'], [0.58, 0.05, 0.3, 0.25, -0.06, 0.02, 0.03],
      [0.64, -0.03, 0.3, 0.22, -0.06, -0.008, 0.03, 'i'], [0.72, 0.05, 0.3, 0.25, -0.06, 0.02, 0.03], [0.84, 0.05, 0.3, 0.25, -0.06, 0.02, 0.03], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.13, -0.02, 0.26, -0.097, ...RL_TOP], [0.18, -0.02, 0.26, -0.097, ...RL_TOP], [0.3, -0.04, 0.36, -0.07, ...RL_TOP, 'o'],
      [0.46, ...RL_OFF], [0.56, -0.02, 0.34, -0.097, ...RL_TOP], [0.64, -0.02, 0.26, -0.097, ...RL_TOP, 'i'],
      [0.72, -0.02, 0.26, -0.097, ...RL_TOP], [0.88, 'home']],
    mag: { carry: [[0.13, 0.3, 0.13], [0.46, 0.64]], hide: [[0.3, 0.46]], toss: { t: 0.3, v: [1.1, 1.5, -0.2], spin: [0, 3, -7], until: 0.64 } },
    sfx: [[0.16, 'click'], [0.3, 'blub'], [0.64, 'splat'], [0.67, 'gloop']],
    extra(u, P, S) {
      if (u < 0.64) return;
      const s = (u - 0.64) * S.dur, w = Math.exp(-s * 7) * Math.sin(s * 30);
      P.mag.scale.set(1 + w * 0.16, 1 - w * 0.24, 1 + w * 0.16);
    },
  },
  beam: { // Cryo Beam: the coolant canister slides out the back (pssht) and gets chucked, a fresh one clicks in
    gun: [[0, ...RL_REST], [0.13, 0.12, 0.3, 0.3, -0.06, 0.03, 0.03, 'o'], [0.64, 0.12, 0.3, 0.3, -0.06, 0.03, 0.03],
      [0.68, 0.06, 0.32, 0.27, -0.06, 0.018, 0.015, 'i'], [0.75, 0.12, 0.3, 0.3, -0.06, 0.03, 0.03], [0.86, 0.12, 0.3, 0.3, -0.06, 0.03, 0.03], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.13, -0.02, 0.18, -0.005, ...RL_TOP], [0.17, -0.02, 0.18, -0.005, ...RL_TOP], [0.3, -0.02, 0.2, 0.13, ...RL_TOP],
      [0.46, ...RL_OFF], [0.56, -0.02, 0.205, 0.13, ...RL_TOP], [0.68, -0.02, 0.18, -0.005, ...RL_TOP, 'i'],
      [0.73, -0.02, 0.2, -0.005, ...RL_TOP], [0.77, -0.02, 0.18, -0.005, ...RL_TOP, 'i'], [0.92, 'home']],
    mag: { carry: [[0.13, 0.3, 0.13], [0.46, 0.68]], hide: [[0.3, 0.46]], toss: { t: 0.3, v: [-0.8, 1.4, 0.5], spin: [4, 2, 8], until: 0.64 } },
    sfx: [[0.14, 'click'], [0.2, 'hiss'], [0.3, 'magout'], [0.68, 'magin'], [0.77, 'tap']],
  },
  chain: { // Storm Caller: flick the battery out, slam a fresh one in, give it a pat. Bzzt.
    gun: [[0, ...RL_REST], [0.14, 0.18, 0.25, 0.35, -0.06, 0.035, 0.02, 'o'], [0.56, 0.2, 0.25, 0.35, -0.06, 0.035, 0.02],
      [0.62, 0.1, 0.25, 0.3, -0.06, 0.01, 0.02, 'i'], [0.7, 0.2, 0.25, 0.35, -0.06, 0.035, 0.02], [0.82, 0.2, 0.25, 0.35, -0.06, 0.035, 0.02], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.12, -0.02, 0.14, 0.03, ...RL_TOP], [0.19, -0.02, 0.14, 0.03, ...RL_TOP], [0.24, -0.04, 0.21, 0.05, ...RL_TOP, 'o'],
      [0.42, ...RL_OFF], [0.5, -0.2, 0.08, 0.06, ...RL_TOP], [0.56, -0.02, 0.21, 0.03, ...RL_TOP], [0.62, -0.02, 0.14, 0.03, ...RL_TOP, 'i'],
      [0.67, -0.02, 0.16, 0.03, ...RL_TOP], [0.71, -0.02, 0.14, 0.03, ...RL_TOP, 'i'], [0.9, 'home']],
    mag: { carry: [[0.42, 0.62]], hide: [[0.2, 0.42]], toss: { t: 0.2, v: [0.5, 1.5, 0.3], spin: [6, 0, 9], until: 0.62 } },
    sfx: [[0.2, 'magout'], [0.62, 'magin'], [0.64, 'sizzle'], [0.71, 'tap']],
  },
  get sniper() { return Object.assign({}, this.chain, { sfx: [[0.2, 'magout'], [0.62, 'magin'], [0.64, 'ghost'], [0.71, 'tap']] }); }, // Phantom Longshot: out with the old ecto cell, in with a fresh one. Oooo.
  rocket: { // Same-Day Launcher: fetch a parcel, shove it down the tube, pat it. Delivered.
    gun: [[0, ...RL_REST], [0.15, 0.18, 0.85, 0.05, -0.03, 0.03, 0.03, 'o'], [0.68, 0.18, 0.85, 0.05, -0.03, 0.03, 0.03],
      [0.72, 0.14, 0.85, 0.05, -0.03, 0.02, 0.06, 'i'], [0.8, 0.18, 0.85, 0.05, -0.03, 0.03, 0.03], [0.88, 0.18, 0.85, 0.05, -0.03, 0.03, 0.03], [1, ...RL_REST]],
    hand: [[0, 'home'], [0.12, -0.08, -0.2, -0.15, ...RL_LOW], [0.3, ...RL_OFF], [0.45, -0.02, -0.03, -0.62, ...RL_LOW],
      [0.53, 0, 0.066, -0.6, ...RL_LOW], [0.72, 0, 0.066, -0.4, ...RL_LOW, 'i'], [0.78, -0.02, 0.1, -0.46, ...RL_TOP],
      [0.84, -0.02, 0.23, -0.3, ...RL_TOP], [0.88, -0.02, 0.2, -0.3, ...RL_TOP, 'i'], [0.97, 'home']],
    mag: { carry: [[0.3, 0.72]] },
    sfx: [[0.12, 'whoosh'], [0.5, 'rustle'], [0.72, 'thunk'], [0.88, 'tap']],
    rest(P, S) { P.mag.visible = S.fill > 0; }, // (the tube's empty)
    extra(u, P, S) {
      if (u >= 0.3) return;
      if (S.fill <= 0) P.mag.visible = false;
      else { const k = rlEase((u - 0.1) / 0.18); P.mag.position.z += 0.2 * k; P.mag.visible = k < 0.95; } // (the last one slides on down)
    },
  },
};

// easing, 0-1
const rlEase = (x) => { x = U.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const rlEaseIn = (x) => { x = U.clamp(x, 0, 1); return x * x * x; };
// a keyframe track at u (see GUN_RELOADS), written into out
function rlTrack(keys, u, out) {
  let i = 0;
  while (i < keys.length - 1 && u >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  let t = b === a ? 1 : U.clamp((u - a[0]) / Math.max(1e-6, b[0] - a[0]), 0, 1);
  const e = typeof b[b.length - 1] === 'string' ? b[b.length - 1] : '';
  t = e === 'i' ? t * t * t : e === 'o' ? 1 - (1 - t) ** 3 : e === 'l' ? t : t * t * (3 - 2 * t);
  for (let k = 0; k < out.length; k++) out[k] = a[k + 1] + (b[k + 1] - a[k + 1]) * t;
  return out;
}
const _rlG = [0, 0, 0, 0, 0, 0], _rlH = [0, 0, 0, 0, 0, 0], _rlA = [0, 0, 0, 0, 0, 0], _rlB = [0, 0, 0, 0, 0, 0];
const _rlV = new V3(), _rlV2 = new V3();
// how far the hand has moved from where it was at `anchor` (what it's carrying moves with it)
function rlCarry(S, u, anchor, out) {
  const h = rlTrack(S.keys, u, _rlA), h0 = rlTrack(S.keys, anchor, _rlB);
  return out.set(h[0] - h0[0], h[1] - h0[1], h[2] - h0[2]);
}
// the Zapper's power cells, lit up to `level` (0-1, back to front), popping (pop: 0-1) as they light
function rlCells(g, level, pop) {
  for (const c of g.children) {
    const i = +c.name.slice(-1), lit = U.clamp(level * 4 - i, 0, 1);
    c.scale.y = 0.12 + 0.88 * lit + (lit > 0 ? 0.45 * pop : 0);
  }
}
// the Squirt Pistol's water, `level` full (sloshing about, how much: slosh)
function rlWater(w, level, slosh, t = 0) {
  const s = slosh ? 0.07 * slosh * Math.sin(t * 23) : 0;
  w.scale.set(1 + s, Math.max(0.06, level) * (1 - s * 0.6), 1 - s);
  w.rotation.z = slosh ? 0.12 * slosh * Math.sin(t * 17) : 0;
}
// the Wisp Caller's ghost, bobbing about in its lantern
function rlGhostBob(g, t) { g.position.y += 0.006 * Math.sin(t * 2.3); g.rotation.y = 0.35 * Math.sin(t * 0.9); }
// a shotgun shell (for the Scattergun's reload), made the first time it's needed
function rlShell(vm) {
  let s = vm.userData.rlShell;
  if (s) return s;
  s = vm.userData.rlShell = new THREE.Group();
  mk(CYL(0.02, 0.02, 0.066, 10), '#d8402f', s, 0, 0.009, 0).castShadow = false; // (toy-sized, like everything else)
  mk(CYL(0.0215, 0.0215, 0.02, 10), '#dba443', s, 0, -0.031, 0).castShadow = false;
  s.visible = false;
  vm.add(s);
  return s;
}

const GunReload = {
  // vm: the gun in your hands (buildZapperVM, then addHands), type: what kind of gun (see ZAPPERS). u: how far
  // through a reload (0-1), or -1 (not reloading). fill: how full it is (0-1: the Squirt Pistol's bottle and
  // the Zapper's cells show it, and the Launcher's tube is empty at 0). dur: how long a reload takes, t: the
  // time. Plays the reload's sounds as it gets to them.
  pose(vm, type, u, fill, dur, t) {
    const R = GUN_RELOADS[type], ud = vm.userData, P = ud.parts || {}, H = ud.hands || {}, hand = H.support || H.free;
    const on = !!R && u >= 0;
    // the gun
    const g = on ? rlTrack(R.gun, u, _rlG) : RL_REST;
    vm.rotation.set(g[0], g[1], g[2]);
    if (ud.base) vm.position.set(ud.base.x + g[3], ud.base.y + g[4], ud.base.z + g[5]);
    // its moving bits, back where they go
    for (const p of Object.values(P)) {
      p.position.copy(p.userData.home); p.rotation.set(0, 0, 0); p.scale.set(1, 1, 1); p.visible = true;
      if (p.userData.each) for (const c of p.children) { c.position.set(0, 0, 0); c.scale.set(1, 1, 1); }
    }
    if (ud.rlToss) ud.rlToss.visible = false;
    if (ud.rlShell) ud.rlShell.visible = false;
    // your left hand
    const home = hand ? (H.support ? [...H.support.userData.home.toArray(), 0, 0, 0] : [...RL_OFF, 0, 0, 0]) : RL_REST;
    const S = { hand, home, fill: U.clamp(fill, 0, 1), dur, t, vm, keys: null };
    if (hand) {
      if (on) {
        S.keys = ud.rlKeys || (ud.rlKeys = R.hand.map((k) => (k[1] === 'home' ? [k[0], ...home.map((v, j) => v + (typeof k[j + 2] === 'number' ? k[j + 2] : 0)), ...k.slice(2).filter((x) => typeof x === 'string')] : k)));
        const k = rlTrack(S.keys, u, _rlH);
        hand.position.set(k[0], k[1], k[2]); hand.rotation.set(k[3], k[4], k[5]);
      } else { hand.position.set(home[0], home[1], home[2]); hand.rotation.set(0, 0, 0); }
      if (H.free) H.free.visible = on;
    }
    // the magazine (battery, tank, canister, parcel): out, chucked away, a new one in
    if (on && R.mag && P.mag && S.keys) {
      const m = P.mag;
      for (const [a, b, anc = b] of R.mag.carry || []) if (u >= a && u <= b) { m.position.add(rlCarry(S, u, anc, _rlV)); break; }
      for (const [a, b] of R.mag.hide || []) if (u >= a && u < b) m.visible = false;
      const T = R.mag.toss;
      if (T && u >= T.t && u < T.until) {
        let c = ud.rlToss;
        if (!c) { c = ud.rlToss = m.clone(); c.traverse((o) => { o.castShadow = false; }); vm.add(c); }
        const s = (u - T.t) * dur, from = _rlV2.copy(m.userData.home);
        for (const [a, b, anc = b] of R.mag.carry || []) if (T.t >= a && T.t <= b) { from.add(rlCarry(S, T.t, anc, _rlV)); break; }
        c.position.set(from.x + T.v[0] * s, from.y + T.v[1] * s + 0.5 * (T.g || -7) * s * s, from.z + T.v[2] * s);
        c.rotation.set(T.spin[0] * s, T.spin[1] * s, T.spin[2] * s);
        c.scale.set(1, 1, 1);
        c.visible = true;
      }
    }
    if (on && R.extra) R.extra(u, P, S);
    else if (R && R.rest) R.rest(P, S);
    // the sounds, as it gets to them
    let last = ud.rlU == null ? -1 : ud.rlU;
    if (on && u < last) last = -1;
    if (on && R.sfx) for (const [bt, s] of R.sfx) if (bt > last && bt <= u) Sound.play(s);
    ud.rlU = on ? u : -1;
  },
  // does this gun have a reload of its own?
  has(type) { return !!GUN_RELOADS[type]; },
};
