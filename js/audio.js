'use strict';
/* =========================================================
   Sound: every effect and song is synthesized live (no files)
   ========================================================= */
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

const Sound = {
  ctx: null, out: null, sfx: null, mus: null, noiseBuf: null,
  music: { on: null, timer: null, step: 0, next: 0 },

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.out = ctx.createDynamicsCompressor();
    this.out.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.out);
    this.mus = ctx.createGain(); this.mus.connect(this.out);
    this.setVolumes();
    const len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
  },
  setVolumes() {
    if (!this.ctx) return;
    this.sfx.gain.value = G.settings.vol;
    this.mus.gain.value = G.settings.music * 0.55;
  },

  tone(f, dur, o = {}) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = f * 0.04;
      l.connect(lg); lg.connect(osc.frequency);
      l.start(t); l.stop(t + dur + 0.05);
    }
    const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    const dest = o.dest || this.sfx;
    if (o.filter) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = o.filter;
      g.connect(fl); fl.connect(dest);
    } else g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.05);
  },
  noise(dur, o = {}) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.ftype || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain(), v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },

  play(name) {
    if (!this.ctx) return;
    const T = (f, d, o) => this.tone(f, d, o), N = (d, o) => this.noise(d, o);
    switch (name) {
      case 'click': T(900, 0.05, { type: 'square', vol: 0.05 }); break;
      case 'open': T(440, 0.07, { type: 'triangle', vol: 0.1 }); T(660, 0.09, { type: 'triangle', vol: 0.1, delay: 0.05 }); break;
      case 'close': T(660, 0.07, { type: 'triangle', vol: 0.08 }); T(440, 0.09, { type: 'triangle', vol: 0.08, delay: 0.05 }); break;
      case 'error': T(160, 0.18, { type: 'square', vol: 0.1 }); break;
      case 'zap': T(1400, 0.12, { type: 'square', slide: 300, vol: 0.07 }); T(700, 0.1, { type: 'sawtooth', slide: 200, vol: 0.05, filter: 3000 }); break;
      case 'shotgun': N(0.22, { freq: 1400, slide: 180, vol: 0.32 }); T(95, 0.16, { slide: 40, vol: 0.22 }); T(900, 0.05, { type: 'square', vol: 0.04, delay: 0.3 }); break;
      case 'lob': T(170, 0.16, { type: 'triangle', slide: 480, vol: 0.14 }); N(0.12, { ftype: 'bandpass', freq: 700, vol: 0.12, q: 2 }); break;
      case 'gloop': N(0.3, { freq: 900, slide: 160, vol: 0.28 }); T(150, 0.2, { slide: 60, vol: 0.18 }); T(420, 0.16, { type: 'triangle', slide: 1300, vol: 0.06, delay: 0.05 }); break;
      case 'beam': T(1700 + Math.random() * 200, 0.12, { type: 'sine', vol: 0.03, vib: 24 }); N(0.1, { ftype: 'highpass', freq: 5200, vol: 0.025 }); break;
      case 'cutter': N(0.32, { ftype: 'bandpass', freq: 2600, slide: 900, vol: 0.14, q: 4 }); T(900, 0.1, { type: 'square', slide: 1500, vol: 0.03 }); break;
      case 'fizz': T(420, 0.35, { type: 'square', slide: 110, vol: 0.05, filter: 1200 }); break;
      case 'vac': N(0.12, { ftype: 'bandpass', freq: 900 + Math.random() * 400, vol: 0.05, q: 3 }); break;
      case 'slurp': T(300, 0.18, { slide: 1400, vol: 0.14, type: 'triangle' }); N(0.15, { ftype: 'bandpass', freq: 2000, vol: 0.1 }); break;
      case 'drill': T(180 + Math.random() * 40, 0.08, { type: 'sawtooth', vol: 0.05, filter: 1400 }); break;
      case 'shatter': N(0.4, { ftype: 'highpass', freq: 3000, vol: 0.25 }); [1800, 2400, 3100].forEach((f, i) => T(f, 0.25, { type: 'triangle', vol: 0.06, delay: i * 0.04 })); break;
      case 'pickup': T(880, 0.07, { type: 'triangle', vol: 0.12 }); T(1320, 0.12, { type: 'triangle', vol: 0.12, delay: 0.06 }); break;
      case 'reload': T(420, 0.05, { type: 'square', vol: 0.06 }); N(0.06, { ftype: 'bandpass', freq: 2500, vol: 0.1, delay: 0.06 }); T(300, 0.06, { type: 'square', vol: 0.05, delay: 0.14 }); break;
      case 'reloaded': T(660, 0.05, { type: 'square', vol: 0.06 }); T(990, 0.09, { type: 'square', vol: 0.06, delay: 0.05 }); break;
      case 'summon':
        T(110, 2.2, { type: 'sawtooth', slide: 55, vol: 0.18, filter: 700, vib: 4 });
        T(220, 2.0, { type: 'triangle', slide: 110, vol: 0.08, vib: 6 });
        N(2.0, { freq: 200, slide: 3000, vol: 0.2, attack: 1.2 });
        break;
      case 'catch': N(0.08, { ftype: 'bandpass', freq: 900, vol: 0.25, q: 2 }); T(784, 0.08, { type: 'triangle', vol: 0.12, delay: 0.04 }); T(1175, 0.18, { type: 'triangle', vol: 0.12, delay: 0.1 }); break;
      case 'rare': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => T(f, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.06 })); break;
      case 'coin': T(988, 0.07, { type: 'square', vol: 0.07 }); T(1319, 0.25, { type: 'square', vol: 0.07, delay: 0.07 }); break;
      case 'cash': for (let i = 0; i < 5; i++) { T(988, 0.06, { type: 'square', vol: 0.05, delay: i * 0.07 }); T(1319, 0.12, { type: 'square', vol: 0.05, delay: i * 0.07 + 0.05 }); } break;
      case 'buy': T(660, 0.08, { type: 'triangle', vol: 0.15 }); T(880, 0.16, { type: 'triangle', vol: 0.15, delay: 0.08 }); break;
      case 'lose': // sad trombone
        [[392, 0.35], [370, 0.35], [349, 0.35], [330, 1.1]].forEach(([f, d], i) =>
          T(f, d, { type: 'sawtooth', vol: 0.12, delay: i * 0.38, filter: 1100, vib: i === 3 ? 6 : 0, attack: 0.03 }));
        break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => T(f, 0.18, { type: 'square', vol: 0.07, delay: i * 0.09 })); break;
      case 'jackpot':
        for (let i = 0; i < 16; i++) T(midi(72 + [0, 4, 7, 12][i % 4] + Math.floor(i / 4) * 2), 0.14, { type: 'square', vol: 0.06, delay: i * 0.07 });
        for (let i = 0; i < 8; i++) T(1319, 0.1, { type: 'square', vol: 0.05, delay: 1.2 + i * 0.08 });
        break;
      case 'tick': T(1800, 0.02, { type: 'square', vol: 0.03 }); break;
      case 'reelstop': T(300, 0.08, { type: 'square', vol: 0.09 }); break;
      case 'throw': N(0.25, { ftype: 'bandpass', freq: 1500, slide: 600, vol: 0.2, q: 1.5 }); break;
      case 'hit': T(240, 0.09, { type: 'square', slide: 90, vol: 0.12 }); N(0.07, { freq: 3000, vol: 0.1 }); break;
      case 'hurt': T(320, 0.25, { type: 'sawtooth', slide: 110, vol: 0.15, filter: 1600 }); break;
      case 'roar': T(90, 1.4, { type: 'sawtooth', slide: 45, vol: 0.22, filter: 500, vib: 5 }); N(1.2, { freq: 500, vol: 0.22 }); break;
      case 'boom': N(0.9, { freq: 700, slide: 80, vol: 0.4 }); T(70, 0.6, { slide: 30, vol: 0.28 }); break;
      case 'splat': N(0.15, { freq: 1600, vol: 0.18 }); T(150, 0.1, { slide: 60, vol: 0.1 }); break;
      case 'bonk': T(700, 0.16, { type: 'square', slide: 180, vol: 0.12 }); break;
      case 'boing': T(200, 0.25, { type: 'triangle', slide: 700, vol: 0.14, vib: 14 }); break;
      case 'jump': T(300, 0.1, { type: 'triangle', slide: 520, vol: 0.05 }); break;
      case 'blub': T(260, 0.12, { slide: 520, vol: 0.16 }); T(300, 0.1, { slide: 600, vol: 0.12, delay: 0.14 }); break;
      case 'flip': for (let i = 0; i < 10; i++) T(1200 + i * 60, 0.03, { type: 'square', vol: 0.04, delay: i * 0.1 }); break;
      case 'death': T(500, 0.9, { type: 'triangle', slide: 60, vol: 0.2 }); break;
      case 'victory': [523, 523, 523, 659, 0, 587, 659, 784].forEach((f, i) => f && T(f, i === 7 ? 0.7 : 0.16, { type: 'square', vol: 0.08, delay: i * 0.13 })); break;
      case 'chat': T(1100, 0.06, { vol: 0.07 }); break;
      case 'warp': T(80, 2.6, { type: 'sawtooth', slide: 900, vol: 0.12, filter: 1800 }); N(2.6, { freq: 300, slide: 5000, vol: 0.18 }); break;
      case 'land': N(0.8, { freq: 400, slide: 90, vol: 0.3 }); break;
      case 'alarm': T(880, 0.2, { type: 'square', vol: 0.06 }); T(660, 0.2, { type: 'square', vol: 0.06, delay: 0.22 }); break;
      case 'phase': this.play('roar'); this.play('boom'); break;
      case 'grenade': N(0.6, { freq: 900, slide: 100, vol: 0.35 }); T(120, 0.4, { slide: 40, vol: 0.2 }); T(600, 0.2, { slide: 1500, vol: 0.06, type: 'triangle' }); break;
      case 'slide': N(0.2, { ftype: 'highpass', freq: 4000, vol: 0.04 }); break;
      case 'dad': T(220, 0.15, { type: 'triangle', vol: 0.1 }); T(196, 0.25, { type: 'triangle', vol: 0.1, delay: 0.16 }); break;
      case 'rimshot': T(180, 0.08, { vol: 0.15 }); N(0.08, { ftype: 'highpass', freq: 1800, vol: 0.12, delay: 0.12 }); N(0.5, { ftype: 'highpass', freq: 6000, vol: 0.08, delay: 0.3 }); break;
    }
  },

  // the ship's engine: a low hum that gets louder with throttle
  engine(on) {
    if (!this.ctx) return;
    if (on && !this.eng) {
      const ctx = this.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter();
      g.gain.value = 0; f.type = 'lowpass'; f.frequency.value = 300;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48;
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
      const ng = ctx.createGain(); ng.gain.value = 0.5;
      o.connect(f); n.connect(ng); ng.connect(f); f.connect(g); g.connect(this.sfx);
      o.start(); n.start();
      this.eng = { g, f, o, n };
    } else if (!on && this.eng) {
      const e = this.eng; this.eng = null;
      e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => { try { e.o.stop(); e.n.stop(); } catch (x) { /* already stopped */ } }, 400);
    }
  },
  engineLevel(x) {
    if (!this.eng) return;
    const t = this.ctx.currentTime;
    this.eng.g.gain.setTargetAtTime(0.05 + x * 0.16, t, 0.1);
    this.eng.f.frequency.setTargetAtTime(220 + x * 900, t, 0.1);
    this.eng.o.frequency.setTargetAtTime(40 + x * 40, t, 0.1);
  },

  /* ---------------- music ---------------- */
  playMusic(name) {
    if (!this.ctx || this.music.on === name) return;
    this.stopMusic();
    const tr = TRACKS[name];
    if (!tr) return;
    this.music.on = name;
    this.music.step = 0;
    this.music.next = this.ctx.currentTime + 0.15;
    this.music.timer = setInterval(() => this._sched(tr), 50);
  },
  stopMusic() {
    clearInterval(this.music.timer);
    this.music.timer = null;
    this.music.on = null;
  },
  _sched(tr) {
    const ctx = this.ctx;
    const spb = 60 / tr.bpm / 4;
    while (this.music.next < ctx.currentTime + 0.2) {
      playStep(tr, this.music.step, this.music.next - ctx.currentTime);
      this.music.step++;
      this.music.next += spb;
    }
  },
};

// a small generic "band": bass + arpeggio + drums following a chord loop
function playStep(tr, step, delay) {
  const S = Sound, d = S.mus;
  const s = step % 16;
  const bar = Math.floor(step / 16) % tr.chords.length;
  const ch = tr.chords[bar];
  const v = tr.vol || 1;
  // bass
  const bassHit = tr.drive ? s % 2 === 0 : (s === 0 || s === 8 || (tr.walk && s === 12));
  if (bassHit) S.tone(midi(ch[0] - 24), tr.drive ? 0.14 : 0.35, { type: tr.bass || 'triangle', vol: 0.13 * v, filter: 900, delay, dest: d });
  // arpeggio
  const every = tr.every || 2;
  if (s % every === 0) {
    const pat = tr.pat || [0, 1, 2, 1];
    const i = pat[(step / every) % pat.length | 0];
    const note = ch[i % ch.length] + 12 * (tr.oct || 0) + (i >= ch.length ? 12 : 0);
    S.tone(midi(note), tr.len || 0.2, { type: tr.wave || 'triangle', vol: 0.05 * v, delay, dest: d, filter: tr.bright || 2600 });
  }
  // sparkles
  if (tr.sparkle && s % 4 === 3 && Math.random() < tr.sparkle) {
    S.tone(midi(ch[U.randi(0, 2)] + 24), 0.5, { type: 'sine', vol: 0.03 * v, delay, dest: d });
  }
  // drums
  if (tr.drums === 'soft') {
    if (s === 0 || s === 10) S.tone(110, 0.14, { slide: 50, vol: 0.12 * v, delay, dest: d });
    if (s % 4 === 2) S.noise(0.05, { ftype: 'highpass', freq: 6000, vol: 0.025 * v, delay, dest: d });
  } else if (tr.drums === 'hard') {
    if (s % 4 === 0) S.tone(120, 0.16, { slide: 42, vol: 0.24 * v, delay, dest: d });
    if (s === 4 || s === 12) S.noise(0.13, { ftype: 'highpass', freq: 1500, vol: 0.1 * v, delay, dest: d });
    if (s % 2 === 1) S.noise(0.03, { ftype: 'highpass', freq: 7000, vol: 0.03 * v, delay, dest: d });
  } else if (tr.drums === 'swing') {
    if (s === 0 || s === 8) S.tone(100, 0.12, { slide: 50, vol: 0.12 * v, delay, dest: d });
    if (s === 4 || s === 12) S.noise(0.08, { ftype: 'bandpass', freq: 2500, vol: 0.05 * v, delay, dest: d });
    if (s % 4 === 0 || s % 4 === 3) S.noise(0.04, { ftype: 'highpass', freq: 8000, vol: 0.025 * v, delay, dest: d });
  }
  // lead stabs for boss tracks
  if (tr.stabs && tr.stabs.includes(s)) {
    S.tone(midi(ch[1] + 12), 0.1, { type: 'square', vol: 0.035 * v, delay, dest: d, filter: 2400 });
  }
}

const TRACKS = {
  menu:  { bpm: 96,  chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], pat: [0, 1, 2, 3, 2, 1], drums: 'soft', sparkle: 0.3 },
  scrap: { bpm: 104, chords: [[57, 60, 64], [62, 65, 69], [57, 60, 64], [64, 67, 71]], pat: [0, 2, 1, 2], drums: 'soft', walk: true, wave: 'square', bright: 1400 },
  gloop: { bpm: 112, chords: [[65, 69, 72], [67, 71, 74], [64, 67, 71], [69, 72, 76]], pat: [0, 1, 2, 3, 2, 1, 0, 2], drums: 'soft', wave: 'sine', len: 0.25, sparkle: 0.2 },
  luck:  { bpm: 118, chords: [[62, 65, 69, 72], [67, 71, 74, 77], [60, 64, 67, 71], [57, 61, 64, 67]], pat: [0, 1, 2, 3], drums: 'swing', walk: true, wave: 'triangle' },
  // inside the Luckstar Casino: smooth, slow and suspiciously relaxing
  lounge: { bpm: 92, chords: [[62, 65, 69, 72, 76], [55, 59, 65, 69, 76], [60, 64, 67, 71, 74], [57, 61, 64, 67, 70]], pat: [0, 2, 4, 3, 1, 2], drums: 'swing', walk: true, wave: 'sine', len: 0.34, sparkle: 0.45, vol: 0.9 },
  frost: { bpm: 88,  chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 66]], pat: [0, 1, 2, 3, 2, 1], every: 2, drums: 'soft', wave: 'sine', len: 0.5, sparkle: 0.6, oct: 1 },
  zorb:  { bpm: 96,  chords: [[57, 60, 64], [58, 62, 65], [57, 60, 64], [56, 59, 64]], pat: [0, 1, 2, 1], drums: 'soft', wave: 'sawtooth', bright: 900, bass: 'sawtooth' },
  space: { bpm: 124, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 66], [52, 55, 59, 62]], pat: [0, 1, 2, 3, 2, 1], drums: 'hard', drive: true, wave: 'triangle', bright: 2200, sparkle: 0.4, vol: 0.8 },
  boss:  { bpm: 150, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], pat: [0, 2, 1, 2], drums: 'hard', drive: true, bass: 'sawtooth', wave: 'square', bright: 1800, stabs: [0, 3, 6, 10, 12], vol: 0.9 },
  final: { bpm: 168, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], pat: [0, 1, 2, 1, 0, 2], drums: 'hard', drive: true, bass: 'sawtooth', wave: 'sawtooth', bright: 1600, stabs: [0, 2, 6, 8, 11, 14], vol: 0.9 },
};
