import * as THREE from 'three';

const WARM = new THREE.Color('#e8793c');
const COOL = new THREE.Color('#d9dce6');

const BG_FRAG = `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uPtr; uniform float uPtrS; uniform float uDim; uniform vec3 uWarm; uniform float uGlow; uniform float uEdge;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 r=mat2(.8,-.6,.6,.8); for(int i=0;i<5;i++){ v+=a*noise(p); p=r*p*2.03+.17; a*=.5; } return v; }
float fbm3(vec2 p){ float v=0., a=.5; mat2 r=mat2(.8,-.6,.6,.8); for(int i=0;i<3;i++){ v+=a*noise(p); p=r*p*2.03+.17; a*=.5; } return v; }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 d=p-uPtr; float r2=dot(d,d);
  float sw=uPtrS*exp(-r2*9.);
  float a=sw*3.2; p=uPtr+mat2(cos(a),-sin(a),sin(a),cos(a))*d;
  vec2 q=p*1.45; q.y-=uTime*.07;
  vec2 w=vec2(fbm(q+vec2(0.,uTime*.05)), fbm(q+vec2(5.2,1.3)-uTime*.035));
  float f=fbm(q+2.4*w+vec2(uTime*.02,0.));
  float g=fbm3(p*.7+vec2(uTime*.016,-uTime*.028)+1.3*w.yx+7.3);
  float smoke=smoothstep(.42,1.0,f)+.55*smoothstep(.34,.9,g)*(1.-.6*uEdge);
  float fall=mix(.4,1.,smoothstep(.7,-.55,p.y));
  float edge=smoothstep(.12,.62,abs(p.x)/(uRes.x/uRes.y)*1.);
  float dens=smoke*mix(fall, .5+.5*edge, uEdge);
  vec3 col=vec3(.012,.012,.018);
  col=mix(col, vec3(.62,.64,.71), dens*.62);
  col+=uWarm*exp(-pow((p.y-.18)*2.6,2.))*exp(-p.x*p.x*2.2)*(.05+.1*f)*uGlow;
  col+=vec3(1.)*sw*.05*smoke;
  col*=uDim;
  col*=mix(.35,1.,smoothstep(-.5,.05,p.y));
  col*=1.-.7*dot(uv-.5,uv-.5);
  gl_FragColor=vec4(col,1.);
}`;

const PT_VERT = `
attribute float aSize; attribute float aAlpha; attribute float aHeat;
uniform float uScale; varying float vA; varying float vH;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=max(1.,aSize*uScale/-mv.z); gl_Position=projectionMatrix*mv; vA=aAlpha; vH=aHeat; }`;
const PT_FRAG = `
precision highp float;
uniform vec3 uCool; uniform vec3 uWarm; uniform float uSharp; uniform float uOpacity;
varying float vA; varying float vH;
void main(){ vec2 c=gl_PointCoord-.5; float d=dot(c,c)*4.; if(d>1.) discard;
  float a=exp(-d*uSharp)*(1.-d); gl_FragColor=vec4(mix(uCool,uWarm,vH), a*vA*uOpacity); }`;

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function sampleLogo(img, max) {
  let W = 720, H, g, c = document.createElement('canvas');
  if (img) { H = Math.round(img.height * W / img.width); c.width = W; c.height = H; g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H); }
  else { H = 200; c.width = W; c.height = H; g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = '900 92px sans-serif'; g.textAlign = 'center'; g.fillText('DARKSKY', W / 2, 130); }
  const d = g.getImageData(0, 0, W, H).data;
  const y0 = 0, y1 = H;
  const pts = []; let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (d[i] + d[i + 1] + d[i + 2] > 380) { pts.push([x, y]); if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const n = Math.min(max, pts.length), w = maxX - minX || 1, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const out = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { out[i * 2] = (pts[i][0] - cx) / w + (Math.random() - .5) / w; out[i * 2 + 1] = -(pts[i][1] - cy) / w + (Math.random() - .5) / w; }
  // plate: the whole picture in lettering-width units, so the page can lay the crisp logo exactly over the particles
  return { pts: out, n, aspect: (maxY - minY) / w, plate: { w: W / w, h: H / w, x: (W / 2 - cx) / w, y: (cy - H / 2) / w } };
}

function makePoints(n, sharp) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), heat = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    vertexShader: PT_VERT, fragmentShader: PT_FRAG, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 500 }, uCool: { value: COOL }, uWarm: { value: WARM }, uSharp: { value: sharp }, uOpacity: { value: 1 } },
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return { pts, geo, mat, pos, size, alpha, heat };
}

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export function isSoftwareGL(gl) {
  try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; return /swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(r || ''); } catch (e) { return false; }
}
const STUB = { fallback: true, enter() {}, setDim() {}, pause() {}, burst() {}, setTopFree() { return Math.round(innerHeight * .4); }, logoBox() { return null; }, dispose() {} };

export async function createSmoke(canvas, { logoUrl, onSlow, onLanded } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return STUB; }
  if (isSoftwareGL(renderer.getContext())) { renderer.dispose(); return STUB; }
  // phones: native-ish resolution is plenty for soft smoke and halves the fragment work; the crisp logo is a DOM image
  const phone = window.innerWidth < 700, dpr = Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x030305, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.z = 10;

  const bgU = { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uPtr: { value: new THREE.Vector2(0, -3) }, uPtrS: { value: 0 }, uDim: { value: 1 }, uWarm: { value: WARM }, uGlow: { value: 1 }, uEdge: { value: 0 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, vertexShader: 'void main(){gl_Position=vec4(position.xy,.999,1.);}', fragmentShader: BG_FRAG, depthTest: false, depthWrite: false,
  }));
  bg.frustumCulled = false; bg.renderOrder = -1; scene.add(bg);

  let img = null; try { img = await loadImg(logoUrl); } catch (e) { }
  var logo = sampleLogo(img, phone ? 6500 : 14000);
  const NL = logo.n, NS = phone ? 700 : 1400;

  const L = makePoints(NL, 9), S = makePoints(NS, 2.2), NP = 260, PF = makePoints(NP, 2.2); // PF: puffs under the finger
  const logoGroup = new THREE.Group(); logoGroup.add(L.pts); scene.add(S.pts); scene.add(logoGroup);
  L.pts.renderOrder = 2; S.pts.renderOrder = 1; PF.pts.renderOrder = 3; scene.add(PF.pts);
  const pv = new Float32Array(NP * 3), plife = new Float32Array(NP), pwarm = new Float32Array(NP); let pnext = 0;
  // a puff of smoke (section change): warm at first if asked, then grey, spreading and fading
  function puff(x, y, n, power, warm = .55) {
    for (let k = 0; k < n; k++) {
      const i = pnext++ % NP, a = Math.random() * Math.PI * 2, sp = (.35 + Math.random() * 1.2) * power;
      PF.pos[i * 3] = x + gauss() * .06; PF.pos[i * 3 + 1] = y + gauss() * .06; PF.pos[i * 3 + 2] = gauss() * .4;
      pv[i * 3] = Math.cos(a) * sp; pv[i * 3 + 1] = Math.sin(a) * sp * .7 + .3; pv[i * 3 + 2] = 0;
      plife[i] = 1; PF.size[i] = .3 + Math.random() * .35; PF.heat[i] = pwarm[i] = warm;
    }
  }

  // Once the particles have landed the page fades the crisp logo in over them (onLanded); crisp mirrors that fade
  let crisp = 0, landed = false, live = false; // live: past the hidden warm-up pass

  let VW = 1, VH = 1, LW = 1, LCY = 0, topFree = 0;
  function layoutLogo() {
    const h = window.innerHeight, free = topFree || h * .66;
    LW = Math.min(VW * .82, 6.2, (free * .5 / h) * VH / Math.max(.05, logo.aspect));
    LCY = VH / 2 - (free * .46 / h) * VH;
    const cyPx = free * .46, halfPx = LW * logo.aspect / 2 / VH * h;
    return Math.round(cyPx + halfPx + 12);
  }
  const lv = new Float32Array(NL * 3), lz = new Float32Array(NL), lseed = new Float32Array(NL), ldelay = new Float32Array(NL), lrel = new Float32Array(NL), lmode = new Uint8Array(NL), lspark = new Uint8Array(NL);
  const lr = new Float32Array(NL * 3); // where each particle sits in the loose smoke
  const TRAVEL = 1.7; // seconds a particle takes to condense out of the smoke into the lettering
  const LANDED = .7 + TRAVEL; // every particle is in place by then
  // The logo condenses out of a wide bank of smoke that tightens into the letters
  function seedLogo(i) {
    L.pos[i * 3] = 0; L.pos[i * 3 + 1] = -VH; L.pos[i * 3 + 2] = 0;
    lv[i * 3] = lv[i * 3 + 1] = lv[i * 3 + 2] = 0; L.alpha[i] = 0; L.size[i] = 1.07; L.heat[i] = .18;
  }
  const sv = new Float32Array(NS * 3), sy0 = new Float32Array(NS), sseed = new Float32Array(NS);

  function spawnSmoke(pos, v, i, y0arr, seedArr, rand) {
    // across the whole width; in the intro a little denser towards the centre
    const x = entered ? (Math.random() - .5) * VW * 1.1 : (Math.random() < .6 ? (Math.random() - .5) * VW * 1.1 : gauss() * VW * .4), y = -VH / 2 - .4 - Math.random() * .6;
    pos[i * 3] = x; pos[i * 3 + 1] = rand ? -VH / 2 + Math.random() * VH * 1.1 : y; pos[i * 3 + 2] = gauss() * 1.4;
    v[i * 3] = gauss() * .08; v[i * 3 + 1] = .35 + Math.random() * .45; v[i * 3 + 2] = .26 + Math.random() * .5; // z slot: own rise speed
    y0arr[i] = y; seedArr[i] = Math.random() * 100;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    VH = 2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * 10; VW = VH * camera.aspect;
    if (logo) layoutLogo();
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    bgU.uRes.value.copy(buf);
    const sc = buf.y / (2 * Math.tan(THREE.MathUtils.degToRad(22.5)));
    L.mat.uniforms.uScale.value = sc; S.mat.uniforms.uScale.value = sc;
  }
  resize();

  for (let i = 0; i < NL; i++) {
    seedLogo(i);
    lz[i] = 0; lseed[i] = Math.random() * 100; ldelay[i] = .15 + Math.abs(logo.pts[i * 2]) * .4 + Math.random() * .35; // centre first
    lr[i * 3] = gauss(); lr[i * 3 + 1] = gauss(); lr[i * 3 + 2] = gauss();
    lspark[i] = 0;
  }
  for (let i = 0; i < NS; i++) spawnSmoke(S.pos, sv, i, sy0, sseed, true);

  // pointer
  var entered = false;
  const ptr = { x: 0, y: -99, vx: 0, vy: 0, s: 0, active: false, lastT: 0, nx: 0, ny: 0 };
  function onMove(cx, cy) {
    const w = window.innerWidth, h = window.innerHeight;
    const x = (cx / w * 2 - 1) * VW / 2, y = -(cy / h * 2 - 1) * VH / 2;
    const now = performance.now(), dt = Math.max(16, now - ptr.lastT) / 1000;
    if (ptr.active) { ptr.vx = (x - ptr.x) / dt; ptr.vy = (y - ptr.y) / dt; }
    ptr.x = x; ptr.y = y; ptr.lastT = now; ptr.active = true;
    ptr.s = Math.min(1, ptr.s + Math.hypot(ptr.vx, ptr.vy) * .02 + .05);
    ptr.nx = cx / w - .5; ptr.ny = cy / h - .5;
    bgU.uPtr.value.set((cx - w / 2) / h, (h / 2 - cy) / h);
  }
  // the finger stirs the smoke, but leaves no glowing puff where it touches
  const pm = e => onMove(e.clientX, e.clientY);
  const pd = e => { ptr.active = false; onMove(e.clientX, e.clientY); ptr.s = Math.min(1, ptr.s + .35); };
  const tm = e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); };
  window.addEventListener('pointermove', pm, { passive: true });
  window.addEventListener('pointerdown', pd, { passive: true });
  window.addEventListener('touchmove', tm, { passive: true });
  window.addEventListener('resize', resize);

  let enterT = 0, dim = 1, dimT = 1, t = 0, last = performance.now(), raf = 0, rotY = 0, rotX = 0, half = false, paused = false;
  let surgeT = -99; // a section change: the smoke thickens for a moment (see burst())
  const SURGE = 0.7;

  function step(dt) {
    t += dt;
    const decay = Math.exp(-dt * 1.8);
    ptr.s *= decay; ptr.vx *= Math.exp(-dt * 5); ptr.vy *= Math.exp(-dt * 5);
    dim += (dimT - dim) * Math.min(1, dt * 2);
    // surge: rises fast, then thins out over SURGE seconds
    const age = t - surgeT, surge = age < 0 || age > SURGE ? 0 : Math.min(1, age / .18) * Math.pow(1 - age / SURGE, 1.6), d = dim + surge * .12;
    bgU.uTime.value = t; bgU.uPtrS.value = ptr.s; bgU.uDim.value = d;
    S.mat.uniforms.uOpacity.value = .15 + .6 * Math.min(1.15, d); bgU.uGlow.value = d; bgU.uEdge.value += ((entered ? 1 : 0) - bgU.uEdge.value) * Math.min(1, dt * 1.5);

    const R = 0.9, R2 = R * R, pxx = ptr.x, pyy = ptr.y, ps = .35 + ptr.s;
    // tilt
    const tr = entered ? 0 : 1;
    rotY += ((Math.sin(t * .4) * .32 + ptr.nx * .6) * tr - rotY) * Math.min(1, dt * 2.5);
    rotX += ((Math.cos(t * .3) * .12 + ptr.ny * .35) * tr - rotX) * Math.min(1, dt * 2.5);
    logoGroup.rotation.set(0, 0, 0);
    if (live && !landed && !entered && t > LANDED - .45) { landed = true; onLanded && onLanded(); }
    crisp += ((landed && !entered ? 1 : 0) - crisp) * Math.min(1, dt * (entered ? 9 : 2.2));

    const P = L.pos;
    for (let i = 0; i < NL; i++) {
      const i3 = i * 3; let x = P[i3], y = P[i3 + 1], z = P[i3 + 2];
      let vx = lv[i3], vy = lv[i3 + 1], vz = lv[i3 + 2];
      const sd = lseed[i];
      if (lmode[i] === 0) {
        if (entered && t >= lrel[i]) {
          // lift-off: flare up like an ember and get carried upwards
          lmode[i] = 1; L.heat[i] = 1; L.alpha[i] = Math.min(L.alpha[i], .35);
          vx += gauss() * .45; vy += 1.3 + Math.random() * 1.7; vz += gauss() * .9;
        } else {
          const tx = logo.pts[i * 2] * LW, ty = logo.pts[i * 2 + 1] * LW + LCY;
          const u = Math.min(1, Math.max(0, (t - ldelay[i]) / TRAVEL));
          if (u >= 1) {
            x = tx; y = ty; z = lz[i]; L.alpha[i] = 1 - crisp; L.size[i] = .024;
            L.heat[i] = entered ? Math.max(0, 1 - (lrel[i] - t) / .22) : 0; // glow just before lift-off
          } else {
            const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(2 - 2 * u, 3) / 2, m = 1 - e, w = LW / 6.2;
            // from a wide bank of smoke down to the narrow lettering
            const bx = tx + (tx * .6 + lr[i * 3] * LW * .6) * m, by = ty + (lr[i * 3 + 1] * VH * .3 - VH * .12) * m;
            // one flow field warps the whole bank, so it folds and drifts like smoke instead of scattering as dots
            const wx = Math.sin(by * 1.3 + t * .5) * .5 + Math.sin(by * 2.9 - bx * .7 + t * .8) * .25;
            const wy = Math.cos(bx * 1.1 - t * .4) * .35 + Math.cos(bx * 2.6 + by * 1.7 + t * .6) * .2;
            x = bx + wx * .5 * m * w; y = by + wy * .5 * m * w; z = lz[i] + lr[i * 3 + 2] * 1.4 * m;
            // large, faint and grey while loose; fine, white and bright on landing
            L.size[i] = .024 + 1.05 * m;
            L.alpha[i] = Math.min(1, t / .6) * (.013 + .987 * Math.pow(e, 9));
            L.heat[i] = .18 * m;
          }
          vx = vy = vz = 0;
        }
      } else {
        vy += (.35 + (sd % 1) * .4) * dt;
        // sideways drift depends on height only: an x-dependent term would herd the particles into bright columns
        vx += (Math.sin(y * 1.3 + t * .6 + sd) * .5 + Math.sin(y * .45 - t * .3 + 1.1) * .5) * .35 * dt;
        const damp = Math.exp(-dt * 1.1); vx *= damp; vy *= damp; vz *= damp;
        L.size[i] += (.9 + (sd % 1) * 1.1 - L.size[i]) * Math.min(1, dt * .9);
        L.alpha[i] += (.012 * (.5 + .5 * dim) - L.alpha[i]) * Math.min(1, dt * 3);
        L.heat[i] += (0 - L.heat[i]) * Math.min(1, dt * 2.5);
        if (y > VH / 2 + 1.5) { x = (Math.random() - .5) * VW * 1.1; y = -VH / 2 - .5 - Math.random() * VH * .7; vx = 0; vy = .4; L.alpha[i] = 0; }
      }
      if (ptr.active && lmode[i] === 1) {
        const dx = x - pxx, dy = y - pyy, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 1e-4, f = (1 - d2 / R2) * ps;
          vx += (dx / d * 9 - dy / d * 5) * f * dt + ptr.vx * f * .06;
          vy += (dy / d * 9 + dx / d * 5) * f * dt + ptr.vy * f * .06;
          vz += (Math.random() - .5) * f * 4 * dt;
        }
      }
      P[i3] = x + vx * dt; P[i3 + 1] = y + vy * dt; P[i3 + 2] = z + vz * dt;
      lv[i3] = vx; lv[i3 + 1] = vy; lv[i3 + 2] = vz;
    }

    const Q = S.pos;
    for (let i = 0; i < NS; i++) {
      const i3 = i * 3; let x = Q[i3], y = Q[i3 + 1], z = Q[i3 + 2];
      let vx = sv[i3], vy = sv[i3 + 1];
      const sd = sseed[i];
      // shared flow field (neighbours drift together) plus a little turbulence of their own
      vx += ((Math.sin(y * .9 + t * .35) * .55 + Math.sin(y * .37 - t * .21 + 1.7) * .45) * .32 + Math.sin(sd + t * .7) * .2) * dt;
      vx *= Math.exp(-dt * .6);
      if (ptr.active) {
        const dx = x - pxx, dy = y - pyy, d2 = dx * dx + dy * dy, RR = 1.8;
        if (d2 < RR) {
          const d = Math.sqrt(d2) + 1e-4, f = (1 - d2 / RR) * ps * (entered ? .35 : 1);
          vx += (dx / d * 2 - dy / d * 3) * f * dt + ptr.vx * f * .05;
          vy += (dy / d * 2 + dx / d * 3) * f * dt + ptr.vy * f * .05;
        }
      }
      vy += (sv[i3 + 2] - vy) * Math.min(1, dt * .4);
      x += vx * dt; y += vy * dt;
      const h = (y - sy0[i]) / (VH + 1), hm = .6 + (sd % 1) * .45; // each puff thins out at its own height
      S.size[i] = .5 + Math.max(0, h) * 3.6;
      S.alpha[i] = .045 * Math.min(1, Math.max(0, h * 6)) * Math.max(0, 1 - h / hm);
      S.heat[i] = Math.max(0, 1 - h * 4) * .85;
      if (y > VH / 2 + 2 || h > hm) { spawnSmoke(Q, sv, i, sy0, sseed, false); continue; }
      Q[i3] = x; Q[i3 + 1] = y; Q[i3 + 2] = z; sv[i3] = vx; sv[i3 + 1] = vy;
    }

    for (let i = 0; i < NP; i++) {
      if (plife[i] <= 0) { PF.alpha[i] = 0; continue; }
      const i3 = i * 3, damp = Math.exp(-dt * 2.4);
      plife[i] -= dt / 1.9;
      pv[i3] *= damp; pv[i3 + 1] = pv[i3 + 1] * damp + .3 * dt;
      PF.pos[i3] += pv[i3] * dt + Math.sin(PF.pos[i3 + 1] * 1.4 + t + i) * .08 * dt; PF.pos[i3 + 1] += pv[i3 + 1] * dt;
      PF.size[i] += dt * (1.1 + (i % 7) * .12);
      PF.alpha[i] = .2 * Math.pow(Math.max(0, plife[i]), 1.4);
      PF.heat[i] = pwarm[i] * plife[i] * plife[i];
    }
    for (const o of [L, S, PF]) {
      o.geo.attributes.position.needsUpdate = true; o.geo.attributes.aSize.needsUpdate = true;
      o.geo.attributes.aAlpha.needsUpdate = true; o.geo.attributes.aHeat.needsUpdate = true;
    }
  }

  for (let k = 0; k < 40; k++) step(1 / 15);
  t = 0; live = true; for (let i = 0; i < NL; i++) seedLogo(i);

  let slowN = 0, frames = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || paused) { last = now; return; }
    // in the menu (once the logo has blown away) the dimmed smoke behind the glass runs at half rate: it moves slowly,
    // and every frame it does change, each glass card has to re-blur what is behind it
    if (entered && t - enterT > 3 && t - surgeT > SURGE && (half = !half)) return;
    const rdt = (now - last) / 1000;
    const dt = Math.min(.05, rdt); last = now;
    if (++frames > 10 && frames < 200) { if (rdt > .09) slowN++; if (slowN > 25) { cancelAnimationFrame(raf); onSlow && onSlow(); return; } }
    step(dt);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    enter(instant) {
      if (entered) return; entered = true; enterT = t;
      for (let i = 0; i < NL; i++) {
        if (instant) { lmode[i] = 1; L.pos[i * 3] = gauss() * VW * .4; L.pos[i * 3 + 1] = -VH / 2 + Math.random() * VH; L.alpha[i] = .012; L.size[i] = 1; continue; }
        lrel[i] = t + .15 + (logo.pts[i * 2] + .5) * .4 + Math.random() * .25; // the lettering lifts off in a wave, once the particles are back
      }
      ptr.s = 1;
    },
    setDim(v) { dimT = v; },
    // frozen on its last frame: under a dish card or the cart (nothing of it shows), and while the page scrolls — then
    // the glass cards need not re-blur a moving background every frame and the phone has its GPU for the clips
    pause(on) { paused = !!on; },
    // Moving between menu sections: a few wisps over the chosen card (CSS px)
    // and the smoke behind the page sways a little
    burst(cx, cy, rw = 0, rh = 0) {
      const w = window.innerWidth, h = window.innerHeight, sx = VW / w, sy = VH / h;
      const x = (cx / w * 2 - 1) * VW / 2, y = -(cy / h * 2 - 1) * VH / 2;
      // a few faint grey wisps over the card: the smoke only sways a little (no thick cloud, no bright spot)
      const ex = Math.max(.5, rw * sx / 2), ey = Math.max(.35, rh * sy / 2);
      for (let k = 0; k < 10; k++) puff(x + (Math.random() * 2 - 1) * ex, y + (Math.random() * 2 - 1) * ey, 1, .25, 0);
      surgeT = t; ptr.s = .3;
    },
    setTopFree(px) { topFree = px; return layoutLogo(); },
    // where the logo picture sits on screen (CSS px), matching the particle lettering
    logoBox() {
      if (!img) return null;
      const h = window.innerHeight, k = h / VH, bw = LW * logo.plate.w * k, bh = LW * logo.plate.h * k;
      return { left: window.innerWidth / 2 + LW * logo.plate.x * k - bw / 2, top: h / 2 - (LCY + LW * logo.plate.y) * k - bh / 2, width: bw, height: bh };
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', pm); window.removeEventListener('pointerdown', pd);
      window.removeEventListener('touchmove', tm); window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
