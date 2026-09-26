'use strict';
/* =========================================================
   Post-processing: soft bloom on bright/glowy things, then a
   color grade (contrast, saturation, vignette, a hint of film
   grain). If the effect scripts didn't load, or quality is set
   to Low, the game just renders straight to the screen.
   ========================================================= */
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignette: { value: 0.32 },
    contrast: { value: 1.08 },
    saturation: { value: 1.1 },
    tint: { value: new THREE.Vector3(1.0, 0.99, 0.97) },
    lift: { value: 0.012 },
    grain: { value: 0.025 },
    hurt: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time, vignette, contrast, saturation, lift, grain, hurt;
    uniform vec3 tint;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c = c * tint + lift;
      // gentle shoulder so bright skies and bloom don't clip hard
      c = c / (1.0 + max(c - 0.85, 0.0) * 0.9);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.2, length(d * vec2(1.0, 0.85)));
      c *= mix(1.0 - vignette, 1.0, v);
      c = mix(c, c * vec3(1.25, 0.55, 0.5), hurt * (1.0 - v));
      c += (rand(vUv * 731.0 + time) - 0.5) * grain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

const Post = {
  on: false, composer: null, bloom: null, grade: null,

  available() {
    return !!(THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass && THREE.UnrealBloomPass && THREE.CopyShader && THREE.LuminosityHighPassShader);
  },
  init() {
    this.apply();
  },
  build() {
    const r = G.renderer, size = r.getDrawingBufferSize(new THREE.Vector2());
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    // keep edges smooth: render into a multisampled target where the browser supports it
    const rt = r.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget
      ? Object.assign(new THREE.WebGLMultisampleRenderTarget(size.x, size.y, opts), { samples: 4 })
      : new THREE.WebGLRenderTarget(size.x, size.y, opts);
    const c = new THREE.EffectComposer(r, rt);
    c.addPass(new THREE.RenderPass(G.scene, G.camera));
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.35, 0.97);
    c.addPass(this.bloom);
    this.grade = new THREE.ShaderPass(GRADE_SHADER);
    c.addPass(this.grade);
    this.composer = c;
  },
  // quality: 'high' = bloom + grade + soft shadows, 'low' = plain render, cheaper shadows
  apply() {
    const high = G.settings.quality !== 'low';
    const r = G.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, high ? 1.5 : 1));
    r.setSize(innerWidth, innerHeight);
    const ms = high ? 2048 : 1024;
    if (G.sun.shadow.mapSize.x !== ms) {
      G.sun.shadow.mapSize.set(ms, ms);
      if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; }
    }
    this.on = high && this.available();
    if (this.on && !this.composer) { try { this.build(); } catch (e) { console.warn('post-processing off:', e.message); this.on = false; } }
    this.resize();
  },
  resize() {
    if (!this.composer) return;
    const r = G.renderer;
    this.composer.setPixelRatio(r.getPixelRatio());
    this.composer.setSize(innerWidth, innerHeight);
  },
  // space looks better with a stronger glow; bright daytime planets need less
  // ([strength, radius, threshold]; the threshold is how bright something must be before it glows)
  setMood(kind) {
    if (!this.bloom) return;
    const m = { space: [0.75, 0.55, 0.62], boss: [0.4, 0.45, 0.9], bossDay: [0.3, 0.4, 0.97], day: [0.22, 0.35, 0.97], night: [0.5, 0.5, 0.8] }[kind] || [0.22, 0.35, 0.97];
    this.bloom.strength = m[0]; this.bloom.radius = m[1]; this.bloom.threshold = m[2];
  },
  render(cam, dt) {
    if (!this.on) { G.renderer.render(G.scene, cam); return; }
    const u = this.grade.uniforms;
    u.time.value = (u.time.value + dt) % 100;
    u.hurt.value = Math.max(0, u.hurt.value - dt * 2.5);
    this.composer.passes[0].camera = cam;
    this.composer.render(dt);
  },
  hurt(k) { if (this.grade) this.grade.uniforms.hurt.value = Math.min(1, this.grade.uniforms.hurt.value + k); },
};
