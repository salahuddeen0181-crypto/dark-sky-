import * as THREE from 'three';

const EMBER = 0xe8793c;
const V2 = (x, y) => new THREE.Vector2(Math.max(0.0001, x), y);
const smooth = (pts, n = 90) => new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(n).map(p => V2(p.x, p.y));
const raw = pts => pts.map(p => V2(p[0], p[1]));
const lathe = (pts, mat, seg = 72) => new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);

const M = {
  glass: (tint = 0xffffff, op = .2) => new THREE.MeshStandardMaterial({ color: tint, metalness: 0, roughness: .04, transparent: true, opacity: op, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false }),
  chrome: (c = 0x1b1b20, r = .2) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: r, envMapIntensity: 1.6 }),
  gold: (r = .26) => new THREE.MeshStandardMaterial({ color: 0xd89a64, metalness: 1, roughness: r, envMapIntensity: 1.7 }),
  matte: (c, r = .6, cc = 0) => new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: r, envMapIntensity: .9 }),
  liquid: (c, e, op = .82) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 1, roughness: .08, transparent: true, opacity: op, envMapIntensity: 1.4, depthWrite: false }),
  glow: c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }),
};

function softSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

function makeEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x040406, side: THREE.BackSide })));
  const panel = (color, k, pos, sc) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.scale.set(...sc); m.lookAt(0, 0, 0); s.add(m); };
  panel(0xffffff, 4, [-7, 5, 5], [7, 3, 1]);
  panel(EMBER, 5, [8, 1, -4], [2.4, 10, 1]);
  panel(0xaab4d8, 1.2, [0, 10, 0], [12, 12, 1]);
  panel(0xffffff, 2, [4, -3, 8], [5, 1.2, 1]);
  panel(EMBER, 1.5, [-6, -4, -6], [6, 2, 1]);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(s, .04, .1, 100, { size: 64 }); pm.dispose(); return rt.texture;
}

const PV = `attribute float aLife; uniform float uSize; uniform float uScale; uniform float uGrow; varying float vL;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uSize*(1.+aLife*uGrow)*uScale/-mv.z; gl_Position=projectionMatrix*mv; vL=aLife; }`;
const PF = `uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity; varying float vL;
void main(){ float a=texture2D(uMap,gl_PointCoord).a*uOpacity*smoothstep(0.,.12,vL)*(1.-vL); if(a<.003) discard; gl_FragColor=vec4(uColor,a); }`;

function emitter(o, sprite) {
  const n = o.n, pos = new Float32Array(n * 3), life = new Float32Array(n), age = new Float32Array(n), off = new Float32Array(n * 3), seed = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uMap: { value: sprite }, uColor: { value: new THREE.Color(o.color) }, uOpacity: { value: o.opacity }, uSize: { value: o.size }, uScale: { value: 300 }, uGrow: { value: o.grow ?? 1.6 } },
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6;
  const sy = o.spreadY || 0, fan = o.fan ?? 1.5;
  const reset = i => { age[i] = 0; off[i * 3] = (Math.random() - .5) * o.spread; off[i * 3 + 1] = (Math.random() - .5) * sy; off[i * 3 + 2] = (Math.random() - .5) * o.spread; seed[i] = Math.random() * 100; };
  for (let i = 0; i < n; i++) { reset(i); age[i] = Math.random() * o.life; }
  pts.userData.tick = dt => {
    for (let i = 0; i < n; i++) {
      age[i] += dt; if (age[i] > o.life) reset(i);
      const a = age[i], k = a / o.life, f = 1 + k * fan;
      pos[i * 3] = o.origin[0] + off[i * 3] * f + Math.sin(a * 1.1 + seed[i]) * o.drift * k;
      pos[i * 3 + 1] = o.origin[1] + off[i * 3 + 1] + o.speed * a;
      pos[i * 3 + 2] = o.origin[2] + off[i * 3 + 2] * f + Math.cos(a * .9 + seed[i]) * o.drift * k;
      life[i] = k;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.aLife.needsUpdate = true;
  };
  return pts;
}

function base(env) {
  const scene = new THREE.Scene(); scene.environment = env;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(EMBER, 3.2); rim.position.set(4, 1.5, -4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, .06));
  const tilt = new THREE.Group(), spin = new THREE.Group(); tilt.add(spin); scene.add(tilt);
  return { scene, tilt, spin, emitters: [] };
}

function iceCube(s = .32) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s, 2, 2, 2), M.glass(0xdfe8ff, .32)); m.renderOrder = 4; return m;
}

const BUILD = {
  hookah({ env, sprite }) {
    const b = base(env), g = b.spin; g.position.y = -.15;
    const vase = lathe(smooth([[0, -1.7], [.5, -1.66], [.78, -1.4], [.82, -1.05], [.62, -.7], [.26, -.48], [.13, -.36]]), M.glass(0x9aa8c8, .26)); vase.renderOrder = 4;
    const water = lathe(smooth([[0, -1.62], [.47, -1.59], [.72, -1.38], [.76, -1.18], [.4, -1.16], [0, -1.16]]), M.liquid(0x2a1408, 0x3a1406, .55)); water.renderOrder = 3;
    const stem = lathe(raw([[0, -.42], [.13, -.42], [.09, -.25], [.075, .55], [.13, .62], [.6, .7], [.62, .76], [.15, .8], [.085, .86], [.085, 1.0], [.14, 1.04], [0, 1.04]]), M.chrome(0x16161b, .18));
    const bowl = lathe(raw([[0, 1.0], [.16, 1.02], [.25, 1.12], [.3, 1.32], [.32, 1.38], [0, 1.38]]), M.matte(0x18181d, .3, 1));
    g.add(vase, water, stem, bowl);
    const coals = []; for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.15, .1, .15), M.glow(0xff7a2e)); const a = i / 3 * Math.PI * 2; c.position.set(Math.cos(a) * .13, 1.43, Math.sin(a) * .13); c.rotation.y = a; coals.push(c); g.add(c); }
    const pl = new THREE.PointLight(EMBER, 6, 5, 1.6); pl.position.set(0, 1.6, 0); g.add(pl);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[.09, .3, 0], [.45, .22, .15], [.95, -.55, .3], [1.12, -1.45, .12], [.95, -1.9, -.2]].map(p => new THREE.Vector3(...p))), 90, .045, 12), M.chrome(0x1d1d22, .38));
    g.add(hose);
    const smoke = emitter({ n: 80, origin: [0, 1.5, 0], spread: .16, speed: .5, life: 3.4, size: .85, grow: 2.2, color: 0xd9dce6, opacity: .22, drift: .45, fan: 3, additive: true }, sprite);
    const ember = emitter({ n: 18, origin: [0, 1.45, 0], spread: .25, speed: .7, life: 1.4, size: .06, grow: -.5, color: 0xffa060, opacity: 1, drift: .25, fan: 1, additive: true }, sprite);
    g.add(smoke, ember); b.emitters.push(smoke, ember);
    b.R = 2.05;
    b.tick = (dt, t, k) => { g.rotation.y += dt * (.25 + k * 3); pl.intensity = 5 + Math.sin(t * 7) * .8 + Math.sin(t * 13) * .5; coals.forEach((c, i) => c.material.color.setHSL(.06, 1, .52 + Math.sin(t * 5 + i * 2) * .06)); };
    return b;
  },

  kitchen({ env }) {
    const b = base(env), g = b.spin;
    const roll = (fc) => {
      const r = new THREE.Group();
      r.add(new THREE.Mesh(new THREE.CylinderGeometry(.64, .64, .5, 64, 1, true), M.matte(0x0c110d, .55, .4)));
      r.add(new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .51, 64), M.matte(0xf2eee6, .85)));
      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .53, 40), M.matte(fc, .3, .6)); f1.position.set(-.06, 0, .02); r.add(f1);
      const f2 = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .535, 32), M.matte(0x8db04a, .4, .3)); f2.position.set(.22, 0, .14); r.add(f2);
      const f3 = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .535, 32), M.matte(0xfffaf0, .5)); f3.position.set(.12, 0, -.24); r.add(f3);
      return r;
    };
    const rolls = [[roll(0xff7a45), [-.62, .55, 0], [1.15, .2, .3]], [roll(0xff6a3a), [.72, .38, -.35], [1.0, -.4, -.2]], [roll(0xffa070), [0, -.62, .35], [1.25, .6, 0]]];
    rolls.forEach(([r, p, rot]) => { r.position.set(...p); r.rotation.set(...rot); g.add(r); });
    const stickMat = M.matte(0x2b1a10, .35, .8);
    for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.018, .042, 3.4, 16), stickMat); s.position.set(.05 + i * .18, .05, -.8); s.rotation.set(0, 0, -.85 + i * .08); g.add(s); }
    b.R = 1.7;
    b.tick = (dt, t, k) => { g.rotation.y += dt * (.18 + k * 3); rolls.forEach(([r, p], i) => { r.position.y = p[1] + Math.sin(t * .9 + i * 2) * .07; r.rotation.y += dt * (.25 + i * .07); }); };
    return b;
  },

  tea({ env, sprite }) {
    const b = base(env), g = b.spin; g.position.y = -.2;
    const cup = lathe(smooth([[0, -.7], [.5, -.68], [.72, -.3], [.78, .35], [.8, .62]]), M.glass(0xffffff, .2)); cup.renderOrder = 4;
    const tea = lathe(smooth([[0, -.63], [.48, -.61], [.68, -.28], [.73, .28], [.35, .29], [0, .29]]), M.liquid(0x8a3c0e, 0x3a1204, .8)); tea.renderOrder = 3;
    const saucer = lathe(raw([[0, -.8], [1.05, -.78], [1.22, -.68], [1.18, -.66], [1.0, -.74], [0, -.74]]), M.chrome(0x141418, .25));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.26, .045, 16, 40, Math.PI * 1.15), M.glass(0xffffff, .3)); handle.position.set(.86, .08, 0); handle.rotation.z = -Math.PI * .57; handle.renderOrder = 4;
    g.add(saucer, tea, cup, handle);
    const steam = emitter({ n: 60, origin: [0, .35, 0], spread: .55, speed: .42, life: 3.2, size: .7, grow: 2, color: 0xe6e8f0, opacity: .16, drift: .4, fan: .6, additive: true }, sprite);
    g.add(steam); b.emitters.push(steam);
    const leafMat = M.matte(0x4f6e2a, .45, .5), leaves = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.17, 20, 12), leafMat); l.scale.set(1, .1, .45); leaves.push({ m: l, r: 1.25 + (i % 3) * .18, y: -.3 + (i % 3) * .45, a: i / 6 * Math.PI * 2, s: .3 + (i % 2) * .15 }); g.add(l); }
    b.R = 1.75;
    b.tick = (dt, t, k) => { g.rotation.y += dt * (.15 + k * 3); leaves.forEach(L => { L.a += dt * L.s; L.m.position.set(Math.cos(L.a) * L.r, L.y + Math.sin(t + L.a) * .12, Math.sin(L.a) * L.r); L.m.rotation.set(t * .6 + L.a, L.a, t * .4); }); };
    return b;
  },

  cocktails({ env }) {
    const b = base(env), g = b.spin; g.position.y = .15;
    const bowlPts = []; for (let i = 0; i <= 24; i++) { const a = i / 24; bowlPts.push([.1 + .82 * Math.pow(a, .6), -.1 + .62 * a * a]); }
    const glass = lathe(raw([[0, -1.32], [.62, -1.3], [.64, -1.26], [.12, -1.2], [.05, -1.05], [.045, -.2], ...bowlPts]), M.glass(0xffffff, .22)); glass.renderOrder = 4;
    const liq = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * .78; liq.push([(.1 + .82 * Math.pow(a, .6)) * .95, -.08 + .62 * a * a]); }
    liq.push([0, liq[liq.length - 1][1]]);
    const drink = lathe(raw([[0, -.08], ...liq]), M.liquid(0xff5a2a, 0x6a1a06, .82)); drink.renderOrder = 3;
    const slice = new THREE.Group();
    slice.add(new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .05, 48), M.matte(0xff8a22, .3, .8)));
    const pulp = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .055, 48), M.matte(0xffb050, .4, .6)); slice.add(pulp);
    for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.6, .058, .012), M.matte(0xfff1d6, .6)); sp.rotation.y = i / 8 * Math.PI; slice.add(sp); }
    slice.position.set(.82, .58, 0); slice.rotation.set(Math.PI / 2, 0, .35);
    g.add(glass, drink, slice);
    const ice = []; [[-1.05, .7, .2], [1.1, -.4, .3], [-.9, -.7, -.3], [.3, 1.05, -.5]].forEach((p, i) => { const c = iceCube(.3 + (i % 2) * .08); c.position.set(...p); ice.push({ c, p, s: .3 + i * .1 }); g.add(c); });
    b.R = 1.75;
    b.tick = (dt, t, k) => { g.rotation.y += dt * (.22 + k * 3); ice.forEach((I, i) => { I.c.rotation.x += dt * I.s; I.c.rotation.y += dt * I.s * .7; I.c.position.y = I.p[1] + Math.sin(t * .8 + i) * .1; }); };
    return b;
  },

  bar({ env }) {
    const b = base(env), g = b.spin;
    const bottle = new THREE.Group(); bottle.position.set(-.38, .1, 0);
    const bm = new THREE.MeshStandardMaterial({ color: 0x0b120e, metalness: .1, roughness: .06, envMapIntensity: 2, transparent: true, opacity: .92 });
    bottle.add(lathe(smooth([[0, -1.6], [.42, -1.58], [.46, -1.42], [.46, .05], [.42, .36], [.17, .74], [.13, 1.15], [.15, 1.22], [.14, 1.5], [0, 1.5]]), bm));
    bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(.468, .468, .62, 64, 1, true, -.9, 1.8), M.gold(.32)));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.155, .155, .26, 32), M.gold(.2)); cap.position.y = 1.44; bottle.add(cap);
    const tumbler = new THREE.Group(); tumbler.position.set(.72, -.98, .45);
    const tg = lathe(raw([[0, -.55], [.44, -.55], [.47, .36]]), M.glass(0xffffff, .24)); tg.renderOrder = 4;
    const tl = lathe(raw([[0, -.5], [.4, -.5], [.42, -.06], [0, -.06]]), M.liquid(0xb5651d, 0x4a1e05, .78)); tl.renderOrder = 3;
    const cube = iceCube(.34); cube.position.set(.02, -.08, 0); cube.rotation.set(.4, .6, .2);
    tumbler.add(tl, cube, tg);
    g.add(bottle, tumbler);
    b.R = 1.95;
    b.tick = (dt, t, k) => { g.rotation.y += dt * (.2 + k * 3); cube.rotation.y += dt * .3; cube.position.y = -.08 + Math.sin(t * 1.2) * .03; };
    return b;
  },

  soft({ env, sprite }) {
    const b = base(env), g = b.spin;
    const slice = (rind, pulp) => {
      const s = new THREE.Group();
      s.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .08, 48), M.matte(rind, .3, .8)));
      s.add(new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .085, 48), M.matte(pulp, .35, .7)));
      for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.88, .09, .016), M.matte(0xfffbe8, .6)); sp.rotation.y = i / 6 * Math.PI; s.add(sp); }
      return s;
    };
    const items = [[slice(0xf2d23c, 0xf8e27a), [-.55, .45, .1]], [slice(0xff7a5a, 0xffb09a), [.6, -.25, -.2]], [slice(0xa8d04a, 0xd2ea8a), [-.2, -.75, .45]]];
    items.forEach(([s, p], i) => { s.position.set(...p); s.rotation.set(1.1 + i * .3, i, .3); g.add(s); });
    const ice = []; [[.85, .75, .1], [-1.0, -.3, -.3], [.2, .25, -.6]].forEach((p, i) => { const c = iceCube(.34); c.position.set(...p); ice.push({ c, p }); g.add(c); });
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.22, 20, 12), M.matte(0x3f8a3a, .4, .6)); leaf.scale.set(1, .08, .45); leaf.position.set(.1, .95, .3); g.add(leaf);
    const bubbles = emitter({ n: 40, origin: [0, -1.6, 0], spread: 2.2, speed: .55, life: 5.5, size: .07, grow: .4, color: 0xffffff, opacity: .55, drift: .15, fan: 0, additive: true }, sprite);
    g.add(bubbles); b.emitters.push(bubbles);
    b.R = 1.65;
    b.tick = (dt, t, k) => { g.rotation.y += dt * (.16 + k * 3); items.forEach(([s, p], i) => { s.rotation.z += dt * (.2 + i * .05); s.position.y = p[1] + Math.sin(t * .8 + i * 2) * .08; }); ice.forEach((I, i) => { I.c.rotation.x += dt * .3; I.c.rotation.z += dt * .2; I.c.position.y = I.p[1] + Math.sin(t + i) * .08; }); leaf.rotation.y = t * .5; };
    return b;
  },

  promos({ env, sprite }) {
    const b = base(env), g = b.spin;
    const coinGeo = new THREE.CylinderGeometry(.62, .62, .1, 72), coinMat = M.gold(.22), rimMat = M.gold(.45);
    const coins = [];
    for (let i = 0; i < 5; i++) { const c = new THREE.Group(); c.add(new THREE.Mesh(coinGeo, coinMat)); const ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .022, 10, 72), rimMat); ring.rotation.x = Math.PI / 2; ring.position.y = .052; c.add(ring); c.position.set(-.55 + Math.sin(i) * .04, -.9 + i * .11, Math.cos(i * 2) * .04); coins.push(c); g.add(c); }
    const hero = new THREE.Group(); hero.add(new THREE.Mesh(new THREE.CylinderGeometry(.78, .78, .12, 80), coinMat));
    for (const s of [1, -1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .028, 10, 80), rimMat); ring.rotation.x = Math.PI / 2; ring.position.y = .062 * s; hero.add(ring); }
    hero.position.set(.55, .2, .2); hero.rotation.x = Math.PI / 2; g.add(hero);
    const sparks = emitter({ n: 26, origin: [.2, -.8, 0], spread: 2, speed: .35, life: 3, size: .07, grow: -.4, color: 0xffb070, opacity: .9, drift: .3, fan: 0, additive: true }, sprite);
    g.add(sparks); b.emitters.push(sparks);
    b.R = 1.6;
    b.tick = (dt, t, k) => { g.rotation.y = Math.sin(t * .3) * .35; hero.rotation.z += dt * (.9 + k * 6); hero.position.y = .2 + Math.sin(t * 1.1) * .08; };
    return b;
  },
};

export function createTiles() {
  const STUB = { register() {}, unregister() {}, dispose() {} };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return STUB; }
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), rn = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(rn || '')) { renderer.dispose(); return STUB; } } catch (e) {}
  renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let CW = 2, CH = 2; renderer.setSize(CW, CH, false);
  const env = makeEnv(renderer), sprite = softSprite();
  const tiles = new Map();
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = e => { ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; };
  const onDown = e => { for (const [el, T] of tiles) { const r = el.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) T.boost = 1; } };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });

  let raf = 0, last = performance.now(), t = 0, Q = 1, slow = 0, skip = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !tiles.size) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    slow = slow * .95 + (dt > .045 ? .05 : 0); if (slow > .6 && Q > .55) { Q = Math.max(.55, Q - .15); slow = 0; }
    if (Q < .9 && (skip = !skip)) return;
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
    const dpr = Math.min(devicePixelRatio || 1, 1.25) * Q, vh = innerHeight;
    const fStart = performance.now(); let n = 0;
    for (const [el, T] of tiles) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.bottom < -40 || r.top > vh + 40) continue;
      if (n++ > 0 && performance.now() - fStart > 14) break;
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
      if (w > CW || h > CH) { CW = Math.max(CW, w); CH = Math.max(CH, h); renderer.setSize(CW, CH, false); }
      const I = T.inst, cam = T.cam, aspect = w / h;
      const dist = I.R / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / Math.min(1, aspect);
      cam.aspect = aspect; cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
      I.tilt.position.x = aspect > 1.25 ? Math.min(I.R * aspect - I.R * 1.15, I.R * 2.4) : 0;
      const sp = (r.top + r.height / 2) / vh - .5;
      const rx = ptr.y * .35 + sp * .55 + Math.sin(t * .5 + T.seed) * .05, ry = ptr.x * .7 + Math.sin(t * .3 + T.seed) * .1;
      T.rx += (rx - T.rx) * Math.min(1, dt * 4); T.ry += (ry - T.ry) * Math.min(1, dt * 4);
      I.tilt.rotation.set(T.rx, T.ry, 0);
      T.boost *= Math.exp(-dt * 2.2);
      I.tick(dt, t, T.boost);
      const sc = h / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
      for (const e of I.emitters) { e.material.uniforms.uScale.value = sc; e.userData.tick(dt); }
      renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); renderer.setScissorTest(true);
      renderer.render(I.scene, cam);
      T.ctx.clearRect(0, 0, w, h);
      T.ctx.drawImage(renderer.domElement, 0, CH - h, w, h, 0, 0, w, h);
    }
  }
  raf = requestAnimationFrame(frame);

  return {
    register(el, kind) {
      if (!el || tiles.has(el) || !BUILD[kind]) return;
      const inst = BUILD[kind]({ env, sprite });
      tiles.set(el, { inst, kind, ctx: el.getContext('2d'), cam: new THREE.PerspectiveCamera(30, 1, .1, 100), rx: 0, ry: 0, boost: 0, seed: Math.random() * 10 });
    },
    unregister(el) { tiles.delete(el); },
    dispose() { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown); renderer.dispose(); },
  };
}
