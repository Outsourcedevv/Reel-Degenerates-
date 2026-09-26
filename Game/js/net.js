'use strict';
/* =========================================================
   Online co-op over WebRTC (PeerJS). The host is the authority:
   it runs bosses, planet travel, snail races and shared pickups.
   ========================================================= */
// everyone else should see these (the host passes them on)
const RELAY = new Set(['chat', 'ann', 'shoot', 'nade', 'fly', 'fph', 'fev']);
// these go to one player only (bonk = zapped by a friend, rvp = being picked up, gift = money)
const TARGETED = new Set(['bonk', 'revive', 'rvp', 'gift']);

const Net = {
  peer: null, conns: new Map(), hostConn: null,
  code: '', online: false, isHost: true, myId: 'solo',
  handlers: {},

  on(t, fn) { this.handlers[t] = fn; },
  emit(m, from) {
    const fn = this.handlers[m.t];
    if (!fn) return;
    try { fn(m, from); } catch (e) { console.error('net handler', m.t, e); }
  },
  peerCfg() {
    return { debug: 1, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
  },
  genCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  },
  errText(e) {
    const t = e && e.type;
    if (t === 'peer-unavailable') return 'Couldn\'t find that room. Check the code?';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Couldn\'t reach the matchmaking server. Check your internet.';
    if (t === 'browser-incompatible') return 'This browser can\'t do multiplayer. Try Chrome or Edge.';
    return 'Connection error: ' + (t || e);
  },

  hostGame(ok, fail) {
    if (typeof Peer === 'undefined') return fail('Multiplayer library didn\'t load. Are you online?');
    const code = this.genCode();
    const peer = new Peer('spcgoob-' + code.toLowerCase(), this.peerCfg());
    this.peer = peer;
    let opened = false;
    peer.on('open', (id) => {
      opened = true;
      this.online = true; this.isHost = true; this.code = code; this.myId = id;
      ok(code);
    });
    peer.on('connection', (conn) => this.accept(conn));
    peer.on('error', (e) => {
      if (opened) { console.warn('peer error', e); return; }
      if (e.type === 'unavailable-id') { try { peer.destroy(); } catch (x) { /* ignore */ } this.hostGame(ok, fail); }
      else fail(this.errText(e));
    });
    peer.on('disconnected', () => { if (!peer.destroyed) { try { peer.reconnect(); } catch (x) { /* ignore */ } } });
  },
  accept(conn) {
    conn.on('open', () => this.conns.set(conn.peer, conn));
    conn.on('data', (d) => { if (d && d.t) this.hostRecv(conn.peer, d); });
    conn.on('close', () => this.drop(conn.peer));
    conn.on('error', () => this.drop(conn.peer));
  },
  drop(id) {
    if (!this.conns.has(id)) return;
    this.conns.delete(id);
    this.emit({ t: 'leave', id });
    this.toAll({ t: 'leave', id });
  },
  hostRecv(id, m) {
    m.from = id;
    if (RELAY.has(m.t)) { this.toAll(m, id); this.emit(m, id); return; }
    if (TARGETED.has(m.t)) {
      if (m.to === this.myId) this.emit(m, id); else this.sendTo(m.to, m);
      return;
    }
    this.emit(m, id);
  },

  joinGame(code, ok, fail) {
    if (typeof Peer === 'undefined') return fail('Multiplayer library didn\'t load. Are you online?');
    const peer = new Peer(undefined, this.peerCfg());
    this.peer = peer;
    let done = false;
    const to = setTimeout(() => {
      if (done) return;
      done = true;
      fail('Couldn\'t find that room. Check the code?');
      try { peer.destroy(); } catch (x) { /* ignore */ }
    }, 14000);
    peer.on('open', (id) => {
      this.myId = id;
      const conn = peer.connect('spcgoob-' + code.toLowerCase(), { reliable: true, serialization: 'json' });
      this.hostConn = conn;
      conn.on('open', () => {
        if (done) return;
        done = true; clearTimeout(to);
        this.online = true; this.isHost = false; this.code = code.toUpperCase();
        ok();
      });
      conn.on('data', (d) => { if (d && d.t) this.emit(d, 'host'); });
      conn.on('close', () => { if (this.online) this.emit({ t: 'hostgone' }); });
      conn.on('error', (e) => console.warn('conn error', e));
    });
    peer.on('error', (e) => {
      if (!done) { done = true; clearTimeout(to); fail(this.errText(e)); }
      else console.warn('peer error', e);
    });
  },

  // client -> host. When we ARE the host (or solo), handle it right here.
  toHost(m) {
    if (this.isHost) { m.from = this.myId; this.emit(m, this.myId); return; }
    if (this.hostConn && this.hostConn.open) this.hostConn.send(m);
  },
  // host -> every client
  toAll(m, except) {
    if (!this.online || !this.isHost) return;
    for (const [id, c] of this.conns) if (id !== except && c.open) c.send(m);
  },
  sendTo(id, m) {
    const c = this.conns.get(id);
    if (c && c.open) c.send(m);
  },
  // "everyone else should see this" (sender already handled it locally)
  relay(m) {
    if (!this.online) return;
    m.from = this.myId;
    if (this.isHost) {
      if (TARGETED.has(m.t)) this.sendTo(m.to, m);
      else this.toAll(m);
    } else if (this.hostConn && this.hostConn.open) this.hostConn.send(m);
  },
  clientCount() { return this.conns.size; },
  leave() {
    this.online = false;
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
  },
};
