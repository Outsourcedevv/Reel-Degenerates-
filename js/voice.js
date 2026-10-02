'use strict';
/* =========================================================
   Proximity voice chat (online games). You hear your crew
   from where they're standing: louder close up, fading out
   with distance, from the left or right. Push to talk (hold
   {talk}), open mic, or off (Options > Audio).
   Each player sends their microphone straight to every other
   player (a PeerJS call over WebRTC, alongside the game's own
   connection to the host): one call each way, the other side
   answers without a microphone of its own, so you can listen
   without one. Someone on another planet, or in the ship while
   you're outside it, can't be heard.
   ========================================================= */
// range: metres where they fade to nothing, near: full volume up to here. ship: everyone in the ship is close
// retry: seconds before calling someone again after a call failed (doubling each time, up to retryMax), connect: how
// long a call gets to connect before it counts as failed
const VOICE = { range: 32, near: 2.5, speakAt: 0.02, retry: 4, retryMax: 60, connect: 10 };

const Voice = {
  mic: null,          // your microphone (a MediaStream), once you've let the game use it
  out: new Map(),     // peer id -> our call to them (carries your voice)
  in: new Map(),      // peer id -> their voice: { call, stream, el, src, an, gain, pan, level }
  fail: new Map(),    // peer id -> { t: when a call to them last failed, n: how many times in a row } (try again later)
  peer: null,

  mode() { return G.settings.voice || 'ptt'; },
  on() { return Net.online && this.mode() !== 'off'; },

  // the game's connection is up (see Net): voice calls can come in from now on, even before the game starts
  attach(peer) {
    if (this.peer === peer) return;
    this.peer = peer;
    peer.on('call', (call) => this.incoming(call));
  },
  // an online game started (or the setting changed): get the microphone
  start() {
    if (!Net.online || !Net.peer) return;
    this.attach(Net.peer);
    if (this.on() && !this.mic && !this.asking) this.getMic();
  },
  getMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { this.noMic('This game can\'t use a microphone here.'); return; }
    this.asking = true;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
      .then((s) => {
        this.asking = false;
        if (!this.on()) { s.getTracks().forEach((t) => t.stop()); return; }
        this.mic = s;
        this.track = s.getAudioTracks()[0];
        this.track.enabled = this.mode() === 'open';
        // (how loud you are, for the "you're talking" light)
        Sound.init();
        if (Sound.ctx) { this.myAn = Sound.ctx.createAnalyser(); this.myAn.fftSize = 512; Sound.ctx.createMediaStreamSource(s).connect(this.myAn); }
        UI.toast(this.mode() === 'ptt' ? keyText('Voice chat on: hold {talk} to talk to your crew nearby.') : 'Voice chat on (open mic): your crew nearby can hear you.', 'good', 3.5);
      })
      .catch(() => { this.asking = false; this.noMic('No microphone (or it wasn\'t allowed): you can still hear your crew.'); });
  },
  noMic(text) { if (!this.toldNoMic) { this.toldNoMic = true; UI.toast(text, '', 4); } this.mic = null; },

  // someone's voice is coming in
  incoming(call) {
    if (!this.on()) { try { call.close(); } catch (e) { /* gone */ } return; }
    call.answer(); // (no microphone of ours on this call: ours goes the other way, see update)
    call.on('stream', (stream) => this.hear(call.peer, stream, call));
    call.on('close', () => this.unhear(call.peer, call));
    call.on('error', () => this.unhear(call.peer, call));
  },
  hear(id, stream, call) {
    Sound.init();
    const ctx = Sound.ctx;
    if (!ctx) return;
    this.unhear(id);
    // (Chromium only plays a call's sound through Web Audio if it's also attached to a (muted) audio element)
    const el = new Audio(); el.muted = true; el.srcObject = stream; el.play().catch(() => {});
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser(); an.fftSize = 512;
    const gain = ctx.createGain(); gain.gain.value = 0;
    const pan = ctx.createPanner();
    Object.assign(pan, { panningModel: 'HRTF', distanceModel: 'linear', refDistance: VOICE.near, maxDistance: VOICE.range, rolloffFactor: 1 });
    src.connect(an); src.connect(gain); gain.connect(pan); pan.connect(this.bus());
    this.in.set(id, { call, stream, el, src, an, gain, pan, level: 0 });
  },
  unhear(id, call) {
    const v = this.in.get(id);
    if (!v || (call && v.call !== call)) return;
    this.in.delete(id);
    try { v.src.disconnect(); v.pan.disconnect(); v.el.srcObject = null; } catch (e) { /* already */ }
    const r = G.remotes.get(id);
    if (r) this.showTalking(r, false);
  },
  // every voice goes through here: Voice volume, then the game's master volume (Options > Audio)
  bus() {
    if (!this.out_ || this.out_.context !== Sound.ctx) { this.out_ = Sound.ctx.createGain(); this.out_.connect(Sound.master || Sound.ctx.destination); }
    this.out_.gain.value = G.settings.voiceVol == null ? 1 : G.settings.voiceVol;
    return this.out_;
  },

  // can I hear them from here? 0: no, 1: positional (on foot near each other), 2: in the ship together (full volume)
  reach(r) {
    const me = G.mode, them = r.s.m;
    if (me === 'space' && them === 'space') return 2;
    if (me !== them) return 0;
    if (me === 'planet' && r.s.p !== G.planet) return 0;
    return 1;
  },

  update(dt) {
    if (!Net.online) return;
    const on = this.on();
    // your microphone: push to talk (held, not typing) or open mic
    if (this.track) {
      const live = on && (this.mode() === 'open' || (Input.down('talk') && !G.chatting));
      if (this.track.enabled !== live) this.track.enabled = live;
      this.talking = live && this.level(this.myAn) > VOICE.speakAt;
      UI.voice(on, live, this.talking);
    } else UI.voice(on && !!this.mic, false, false);
    if (!on) { if (this.out.size || this.in.size) this.hangUp(); return; }
    if (!this.mic && !this.asking && this.peer) this.getMic();
    // a call to everyone in the crew (carrying your voice), and none to anyone who's left
    if (this.mic && this.peer && !this.peer.destroyed) {
      const failed = (id) => { const f = this.fail.get(id) || { n: 0 }; this.fail.set(id, { t: G.time, n: f.n + 1 }); };
      for (const id of G.remotes.keys()) {
        const f = this.fail.get(id);
        if (this.out.has(id) || (f && G.time - f.t < Math.min(VOICE.retryMax, VOICE.retry * 2 ** (f.n - 1)))) continue;
        let call;
        try { call = this.peer.call(id, this.mic, { metadata: { v: 1 } }); } catch (e) { call = null; }
        if (!call) { failed(id); continue; }
        call.at = G.time;
        this.out.set(id, call);
        const gone = () => { if (this.out.get(id) === call) { this.out.delete(id); failed(id); } };
        call.on('close', gone); call.on('error', gone);
      }
      // (a call that never connected, say they weren't ready for it yet: hang up, and call again)
      for (const [id, call] of this.out) {
        if (call.open) { this.fail.delete(id); continue; }
        if (G.time - call.at > VOICE.connect) { this.out.delete(id); failed(id); try { call.close(); } catch (e) { /* gone */ } }
      }
    }
    for (const [id, call] of this.out) if (!G.remotes.has(id)) { this.out.delete(id); try { call.close(); } catch (e) { /* gone */ } }
    for (const id of [...this.in.keys()]) if (!G.remotes.has(id)) this.unhear(id);
    // where they are, how loud, and who's talking
    const ctx = Sound.ctx;
    if (!ctx || !this.in.size) return;
    this.placeListener(ctx);
    for (const [id, v] of this.in) {
      const r = G.remotes.get(id);
      if (!r) continue;
      const reach = this.reach(r), t = ctx.currentTime;
      if (reach === 1) {
        const p = r.pos;
        this.setPos(v.pan, p.x, p.y + 1.6, p.z, t);
        v.pan.distanceModel = 'linear';
      } else { // (in the ship together: right here with you)
        const c = G.camera.position;
        this.setPos(v.pan, c.x, c.y, c.z - 0.5, t);
      }
      v.gain.gain.setTargetAtTime(reach ? 1 : 0, t, 0.08);
      const lv = this.level(v.an);
      v.level = Math.max(lv, v.level - dt * 0.6);
      this.showTalking(r, reach > 0 && v.level > VOICE.speakAt && this.loudness(r, reach) > 0.05);
    }
  },
  // how loud they'd be (the same falloff as the panner): for the speaker icon over their head
  loudness(r, reach) {
    if (reach === 2) return 1;
    const d = r.pos.distanceTo(G.camera.position);
    return U.clamp(1 - (d - VOICE.near) / (VOICE.range - VOICE.near), 0, 1);
  },
  level(an) {
    if (!an) return 0;
    const b = this.buf || (this.buf = new Float32Array(512));
    an.getFloatTimeDomainData(b);
    let s = 0;
    for (let i = 0; i < b.length; i++) s += b[i] * b[i];
    return Math.sqrt(s / b.length);
  },
  placeListener(ctx) {
    const L = ctx.listener, cam = G.camera, t = ctx.currentTime;
    const f = new V3(0, 0, -1).applyQuaternion(cam.quaternion), u = new V3(0, 1, 0).applyQuaternion(cam.quaternion), p = cam.position;
    if (L.positionX) {
      L.positionX.setTargetAtTime(p.x, t, 0.02); L.positionY.setTargetAtTime(p.y, t, 0.02); L.positionZ.setTargetAtTime(p.z, t, 0.02);
      L.forwardX.setTargetAtTime(f.x, t, 0.02); L.forwardY.setTargetAtTime(f.y, t, 0.02); L.forwardZ.setTargetAtTime(f.z, t, 0.02);
      L.upX.setTargetAtTime(u.x, t, 0.02); L.upY.setTargetAtTime(u.y, t, 0.02); L.upZ.setTargetAtTime(u.z, t, 0.02);
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  },
  setPos(pan, x, y, z, t) {
    if (pan.positionX) { pan.positionX.setTargetAtTime(x, t, 0.03); pan.positionY.setTargetAtTime(y, t, 0.03); pan.positionZ.setTargetAtTime(z, t, 0.03); }
    else pan.setPosition(x, y, z);
  },
  // a speaker over their name while you can hear them talking
  showTalking(r, on) {
    if (on && !r.voiceTag) {
      r.voiceTag = speakerSprite();
      r.voiceTag.position.y = 3.15;
      r.m.root.add(r.voiceTag);
    }
    if (r.voiceTag && r.voiceTag.visible !== on) r.voiceTag.visible = on;
    r.talking = on;
  },
  // voice off (or the game's over): every call down
  hangUp() {
    for (const c of this.out.values()) { try { c.close(); } catch (e) { /* gone */ } }
    this.out.clear();
    for (const id of [...this.in.keys()]) { const v = this.in.get(id); try { v.call.close(); } catch (e) { /* gone */ } this.unhear(id); }
  },
  // the setting changed (see Options)
  changed() {
    if (!this.on()) {
      this.hangUp();
      if (this.mic) { this.mic.getTracks().forEach((t) => t.stop()); this.mic = null; this.track = null; this.myAn = null; }
    } else this.start();
    if (this.out_) this.out_.gain.value = G.settings.voiceVol == null ? 1 : G.settings.voiceVol;
  },
};

// the speaker icon over someone talking
function speakerSprite() {
  const tex = canvasTex(64, 64, (c) => {
    c.fillStyle = 'rgba(10,14,22,.65)'; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7dff8a'; c.strokeStyle = '#7dff8a'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(14, 26); c.lineTo(22, 26); c.lineTo(32, 17); c.lineTo(32, 47); c.lineTo(22, 38); c.lineTo(14, 38); c.closePath(); c.fill();
    c.beginPath(); c.arc(34, 32, 8, -0.8, 0.8); c.stroke();
    c.beginPath(); c.arc(34, 32, 15, -0.8, 0.8); c.stroke();
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(0.42, 0.42, 1);
  s.renderOrder = 11;
  return s;
}
