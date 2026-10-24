'use client';
// DARKSKY Hookah Lounge — digital menu. Ported from the DarkSky_Menu.html design export:
// the logic (state, view-model) is kept as one class; the markup keeps the design's inline styles verbatim.
import React from 'react';
import { preload } from 'react-dom';
import * as D from '@/lib/darksky-data';
import { PHOTO_CREDITS } from '@/lib/darksky-credits';
import { css, Arrow, Close, CLOSE_BTN, GLASS } from './menu-ui';
// In the first bundle, not a lazy chunk: on a far server every extra round trip delays the intro by ~0.3–1 s
import { createSmoke } from '@/lib/smoke-scene';
import OrderReview from './OrderReview';

const GREET = ['Hola', 'Hello', 'Привет', '你好', 'नमस्ते', 'مرحبا', 'Bonjour', 'Olá', 'Hallo', 'こんにちは'];
const EN = { en: 'English', es: 'Spanish', ru: 'Russian', zh: 'Chinese', hi: 'Hindi', ar: 'Arabic', fr: 'French', pt: 'Portuguese', de: 'German', ja: 'Japanese' };

const Plus = ({ size = 16, w = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={w} strokeLinecap="round" /></svg>
);
// Previous / next dish on the photo in the item sheet
const STEP_BTN = 'position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:38px;height:38px;border-radius:50%;background:rgba(5,5,8,.45);border:1px solid rgba(255,255,255,.2);color:#f2f2f4;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
const Grip = () => (
  <div style={css('display:flex;justify-content:center')}><div style={css('width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,.2)')} /></div>
);

// The logo file is white on black. Turn the black into real transparency so the logo sits on the smoke without
// mix-blend-mode — iOS Safari does not blend a fixed element over the WebGL canvas and showed a black box.
function alphaLogo(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let k = 0; k < p.length; k += 4) {
        const l = Math.max(p[k], p[k + 1], p[k + 2]);
        p[k + 3] = Math.max(0, Math.min(255, (l - 40) * 255 / 150)); // near-black → clear, soft edges kept, crisp body
        p[k] = p[k + 1] = p[k + 2] = 255;
      }
      g.putImageData(d, 0, 0); res(c.toDataURL('image/png'));
    };
    img.onerror = rej; img.src = src;
  });
}

// Bottom-sheet gestures: pull down to close (only when scrolled to the top, so normal scrolling still works);
// swipe sideways to step to the neighbouring dish — unless the touch starts on a horizontally scrolling strip.
const hScroller = (n, root) => { for (; n && n !== root; n = n.parentElement) if (n.scrollWidth > n.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true; return false; };
function sheetDrag(el, close, swipe) {
  let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0, mode = null, noX = false, atTop = false;
  const start = e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = dy = 0; t0 = performance.now(); mode = null; noX = !swipe || hScroller(e.target, el); atTop = el.scrollTop <= 0; };
  const move = e => {
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!mode) {
      if (!noX && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.3) mode = 'x';
      else if (my > 8 && my > Math.abs(mx) && atTop && el.scrollTop <= 0) { mode = 'y'; el.style.transition = 'none'; }
      else if (Math.abs(my) > 10 || Math.abs(mx) > 10) mode = 'none';
    }
    const page = el.firstElementChild;
    if (mode === 'y') { dy = Math.max(0, my); el.style.transform = `translateY(${dy}px)`; e.preventDefault(); }
    else if (mode === 'x' && page) { dx = mx; page.style.transition = 'none'; page.style.transform = `translateX(${dx * .5}px)`; page.style.opacity = String(1 - Math.min(.5, Math.abs(dx) / 500)); e.preventDefault(); }
  };
  const end = () => {
    const fast = performance.now() - t0 < 260, page = el.firstElementChild;
    if (mode === 'y') {
      el.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
      if (dy > 140 || (fast && dy > 60)) { close(); setTimeout(() => { el.style.transform = ''; }, 400); } else el.style.transform = '';
    } else if (mode === 'x' && page) {
      page.style.transition = 'transform .25s ease, opacity .25s ease'; page.style.transform = ''; page.style.opacity = '';
      if (Math.abs(dx) > 60 || (fast && Math.abs(dx) > 25)) swipe(dx < 0 ? 1 : -1);
    }
    mode = null;
  };
  el.addEventListener('touchstart', start, { passive: true }); el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end); };
}

// Drifting smoke behind the products (texture: scripts/make-smoke.mjs, motion: .ds-smoke in globals.css)
// still: no drift (list rows, where dozens of them would all animate at once)
const Smoke = ({ still }) => <div className={still ? 'ds-smoke still' : 'ds-smoke'} aria-hidden="true"><i /><i /></div>;

// Keyed product clip from scripts/key-videos.mjs: the still first, the video only while it is on screen.
// Safari and iOS get HEVC with alpha (.mov), everyone else VP9 with alpha (.webm); '#t=' starts it on the still's frame.
const CLIP = css('position:relative;width:100%;height:100%;object-fit:contain;display:block;transform:scale(1.2)');
function ProductClip({ src, v, fit }) {
  const ref = React.useRef(null);
  // small places (rows, mini cards, small tiles) get the 320 px still from scripts/make-thumbs.mjs
  const [file, t] = src.split('#t='), stem = file.replace(/\.webm$/i, ''), still = stem + (v === 'still' || v === 'sm' ? '-th' : '') + '.webp';
  React.useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ua = navigator.userAgent, hevc = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android|Firefox/.test(ua);
    const url = stem + (v === 'sm' ? '-sm' : '') + (hevc ? '.mov' : '.webm') + (t ? '#t=' + t : '');
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return el.pause();
      if (!el.getAttribute('src')) el.src = url;
      el.play().catch(() => {});
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => { io.disconnect(); el.pause(); };
  }, [stem, t, v]);
  const style = fit ? { ...CLIP, ...fit } : CLIP;
  if (v === 'still') return <img src={still} alt="" loading="lazy" style={style} />; // eslint-disable-line @next/next/no-img-element
  return <video ref={ref} poster={still} muted loop playsInline preload="none" style={style} />;
}

const CUT = css('position:relative;width:100%;height:100%;object-fit:contain;display:block;padding:7% 6%;box-sizing:border-box;filter:drop-shadow(0 10px 16px rgba(0,0,0,.6))');

// Section tiles on the home screen: the dish sits where the 3D scene was (right of the text / above it)
const HERO_FIT = { objectPosition: '82% 50%', transform: 'scale(1.08)' }, TILE_FIT = { objectPosition: '50% 20%', transform: 'scale(1.1)' };
const WIDE_FIT = { objectPosition: '88% 60%', transform: 'scale(1.3)', transformOrigin: '88% 60%' }; // wide tile: keep clear of the big number on the left

// Product media: photo, keyed clip, plain looping video or a 3D model from MEDIA; a quiet name placeholder until one is set.
// v: 'full' for the big boxes, 'sm' for small cards (lighter clip), 'still' for list rows (picture only).
function Media({ m, label = true, v = 'full' }) {
  const fill = css('width:100%;height:100%;object-fit:cover;display:block');
  // cut-out product photo (scripts/cutout.swift, or background removed in the admin): on the same smoky stage as the clips
  if (m.mImg && m.mCut) return <><Smoke still={v === 'still'} /><img src={v !== 'full' && m.mSrc.startsWith('/media/cut/') ? m.mSrc.replace(/\.webp$/, '-th.webp') : m.mSrc} alt="" loading="lazy" style={CUT} /></>; // eslint-disable-line @next/next/no-img-element
  if (m.mImg) return <img src={m.mSrc} alt="" style={fill} />; // eslint-disable-line @next/next/no-img-element
  if (m.mVideo && /^\/media\/.+\.webm(#|$)/.test(m.mSrc)) return <><Smoke still={v === 'still'} /><ProductClip src={m.mSrc} v={v} /></>;
  if (m.mVideo) return <video src={m.mSrc} autoPlay muted loop playsInline style={fill} />;
  if (m.mModel) {
    return React.createElement('model-viewer', {
      src: m.mSrc, 'auto-rotate': '', 'camera-controls': m.mCtl ? '' : undefined, 'disable-zoom': '', 'interaction-prompt': 'none',
      'shadow-intensity': '1', exposure: '1.1', style: css('width:100%;height:100%;display:block;background:transparent;--poster-color:transparent'),
    });
  }
  if (!label) return <Smoke still />;
  return (
    <>
      <Smoke />
      <div style={css('position:absolute;inset:0;display:flex;align-items:flex-end;padding:10px 12px;font:500 10px/1.25 Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,242,244,.22)')}>
        {m.mPh}
      </div>
    </>
  );
}

// Product stage: black with a soft light-grey glow behind the dish (and drifting smoke from <Media>)
const MEDIA_BG = 'position:relative;overflow:hidden;background:radial-gradient(70% 62% at 50% 45%, rgba(196,199,208,.34), rgba(110,112,120,.12) 48%, rgba(0,0,0,0) 76%), #020203';
const GLASS_TINT = 'rgba(160,165,180,.13)', GLASS_TINT_TEXT = 'rgba(150,155,170,.17)'; // light veil; a touch denser under running text

function MiniCard({ p, w, mh, bg, btn }) {
  return (
    <div onClick={p.onOpen} style={css(`flex:none;width:${w}px;padding:0 14px 14px;overflow:hidden;border-radius:${w > 160 ? 18 : 16}px;border:1px solid rgba(255,255,255,.1);background:${bg};display:flex;flex-direction:column;justify-content:space-between;gap:${w > 160 ? 16 : 12}px;cursor:${p.onOpen ? 'pointer' : 'default'}`)}>
      <div style={css(`height:${mh}px;margin:0 -14px;${MEDIA_BG}`)}><Media m={p} v="sm" /></div>
      <div style={css(`display:flex;flex-direction:column;gap:${w > 160 ? 6 : 5}px`)}>
        <span style={css(`font:500 10px/1 Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,242,244,${w > 160 ? '.55' : '.5'})`)}>{p.cat}</span>
        <span style={css(`font:600 ${w > 160 ? '14.5px' : '14px'}/1.3 Manrope,sans-serif`)}>{p.name}</span>
      </div>
      <div style={css('display:flex;align-items:center;justify-content:space-between')}>
        <span style={css('font:600 13px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>{p.price}</span>
        <button onClick={p.onAdd} aria-label="Add" style={css(`width:${btn}px;height:${btn}px;border-radius:50%;background:#f2f2f4;color:#050507;display:flex;align-items:center;justify-content:center`)}><Plus size={13} w={1.8} /></button>
      </div>
    </div>
  );
}

function StrengthBar({ segs, h, gap, r }) {
  return (
    <div style={css(`display:flex;gap:${gap}px`)}>
      {segs.map((s, i) => <div key={i} style={css(`flex:1;height:${h}px;border-radius:${r}px;background:${s.bg}`)} />)}
    </div>
  );
}

function Badge({ children, bg, color, size = 10, pad = '4px 7px', radius = 6 }) {
  return <span style={css(`font:700 ${size}px/1 Manrope,sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:${pad};border-radius:${radius}px;background:${bg};color:${color}`)}>{children}</span>;
}

export default class DarkskyMenu extends React.Component {
  // items: menu from the database (falls back to the bundled menu); table: { number, token } from the QR link, or null.
  static defaultProps = { smokeIntensity: 0.4, skipIntro: false, items: D.ITEMS, table: null, logoUrl: '/darksky-logo.jpg' };
  state = { gi: 0, gOn: true, ready: false, phase: 'intro', view: 'home', sec: null, contentOn: true, lang: 'es', cat: 'hookah', q: '', searchOpen: false, sheetId: null, vi: 0, qty: 1, cartOpen: false, langOpen: false, cart: [], cash: false, sent: false, sending: false, sendErr: '', orderId: null, orderStatus: null, toast: '', toastOn: false };
  canvasRef = React.createRef();
  introRef = React.createRef();
  _els = {}; _kinds = {}; _refs = {}; _drag = {}; _dragOff = {};
  dragRef(key) {
    return (this._drag[key] ||= el => {
      this._dragOff[key]?.();
      if (key === 'item') this._sheetEl = el;
      this._dragOff[key] = el ? sheetDrag(el, () => this.closeAll(), key === 'item' ? dir => this.stepItem(dir) : null) : null;
    });
  }

  async componentDidMount() {
    this.D = D;
    let lang = null; try { lang = localStorage.getItem('darksky.lang'); } catch (e) {}
    if (!lang) { const n = (navigator.language || 'es').slice(0, 2); lang = D.LANGS.some(l => l.code === n) ? n : 'es'; }
    const skip = !!this.props.skipIntro;
    this.setState({ ready: true, lang, phase: skip ? 'menu' : 'intro' });
    alphaLogo(this.props.logoUrl).then(logoAlpha => this.setState({ logoAlpha })).catch(() => {});
    if (skip) setTimeout(() => this.loadTiles(), 300);
    requestAnimationFrame(() => this.layoutIntro());
    this._gt = setInterval(() => { if (this.state.phase !== 'intro') return; this.setState({ gOn: false }); setTimeout(() => this.setState(st => ({ gi: st.gi + 1, gOn: true })), 450); }, 2400);
    try {
      if (!this.canvasRef.current) return;
      this.scene = await createSmoke(this.canvasRef.current, { logoUrl: this.props.logoUrl, onSlow: () => this.setState({ no3d: true }), onLanded: () => this.setState({ logoOn: true }) });
      if (this.scene.fallback) this.setState({ no3d: true }); else setTimeout(() => this.setState({ sceneOn: true }), 2200);
      if (this.state.phase !== 'intro') { this.scene.enter(true); this.scene.setDim(this.dimVal()); }
      this.layoutIntro();
      this._onResize = () => this.layoutIntro();
      window.addEventListener('resize', this._onResize);
    } catch (e) { console.error('smoke scene', e); }
  }
  componentDidUpdate(pp) {
    if (pp.smokeIntensity !== this.props.smokeIntensity && this.scene && this.state.phase === 'menu') this.scene.setDim(this.dimVal());
    // the page behind an open sheet must not scroll
    const lock = !!(this.state.sheetId || this.state.cartOpen || this.state.langOpen || this.state.reviewOpen) ? 'hidden' : '';
    if (document.documentElement.style.overflow !== lock) document.documentElement.style.overflow = document.body.style.overflow = lock;
  }
  componentWillUnmount() { clearInterval(this._gt); clearInterval(this._poll); clearTimeout(this._lt); this.tiles && this.tiles.dispose(); this.scene && this.scene.dispose(); clearTimeout(this._tt); clearTimeout(this._nt); this._onResize && window.removeEventListener('resize', this._onResize); }

  loadTiles() {
    // three.js is only needed for sections without a clip; skip it while no 3D canvas is on the page
    if (this._tilesLoading || this.state.no3d || !Object.keys(this._els).length) return; this._tilesLoading = true;
    import('@/lib/tiles-scene').then(TS => {
      this.tiles = TS.createTiles();
      Object.entries(this._els).forEach(([k, el]) => this.tiles.register(el, this._kinds[k]));
    }).catch(e => console.error('tiles scene', e));
  }
  tileRef(key, kind) {
    if (!this._refs[key]) {
      this._kinds[key] = kind;
      this._refs[key] = el => {
        if (el) { this._els[key] = el; if (this.tiles) this.tiles.register(el, kind); else if (this.state.phase !== 'intro') this.loadTiles(); }
        else { const o = this._els[key]; o && this.tiles && this.tiles.unregister(o); delete this._els[key]; }
      };
    }
    return this._refs[key];
  }
  // Section change: a cloud of smoke bursts from the tap, the page dissolves into it and the next one condenses out
  nav(view, sec, e) {
    const go = () => {
      document.querySelector('.ds-page.ds-picking')?.classList.remove('ds-picking'); // the page element stays, the cards don't
      const S = sec && this.C.SECTIONS.find(x => x.id === sec);
      this.setState({ view, sec: sec || null, cat: (S && S.cats[0]) || 'hookah', q: '', searchOpen: false, contentOn: false, leaving: false });
      window.scrollTo(0, 0);
      clearTimeout(this._nt); this._nt = setTimeout(() => this.setState({ contentOn: true }), 60);
    };
    const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.scene || this.state.phase !== 'menu' || calm || this.state.leaving || this._picking) return go();
    // a section card first lifts and lights up while the rest of the page steps back, then breaks up into smoke
    const card = e && e.currentTarget && e.currentTarget.closest && e.currentTarget.closest('[data-tile]');
    const smoke = () => {
      const r = card ? card.getBoundingClientRect() : null;
      if (r) this.scene.burst(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height);
      else { const p = e && e.clientX ? e : { clientX: innerWidth / 2, clientY: innerHeight / 2 }; this.scene.burst(p.clientX, p.clientY); }
      this._picking = false;
      this.setState({ leaving: true });
      clearTimeout(this._lt); this._lt = setTimeout(go, 240);
    };
    if (!card) return smoke();
    this._picking = true;
    card.classList.add('ds-picked');
    card.closest('.ds-page')?.classList.add('ds-picking');
    clearTimeout(this._lt); this._lt = setTimeout(smoke, 170);
  }
  layoutIntro() {
    const el = this.introRef.current, h = window.innerHeight;
    const block = el ? el.getBoundingClientRect().height : h * 0.34;
    const free = Math.max(140, h - block - 8), lf = free + 'px';
    if (!this.scene) { if (lf !== this.state.logoFree) this.setState({ logoFree: lf }); return; }
    const top = this.scene.setTopFree(free);
    const st = top + 'px', on = top + 24 < free;
    if (st !== this.state.subTop || on !== this.state.subOn || lf !== this.state.logoFree) this.setState({ subTop: st, subOn: on, logoFree: lf });
    const b = this.scene.logoBox(), bs = b ? `left:${b.left.toFixed(1)}px;top:${b.top.toFixed(1)}px;width:${b.width.toFixed(1)}px;height:${b.height.toFixed(1)}px` : '';
    if (bs !== (this.state.logoBox || '')) this.setState({ logoBox: bs });
  }
  dimVal() { return this.props.smokeIntensity ?? 0.4; }

  t(k) { const U = D.UI; return (U[this.state.lang] || U.en)[k] ?? U.en[k]; }
  tX(k) { const X = D.UI_X; return (X[this.state.lang] || X.en)[k]; }
  // Tiles, categories, promotions and rules as edited in the admin (src/lib/content.js), else the bundled ones
  get C() { return this.props.content || D; }
  tx(o) { if (o == null) return ''; if (typeof o === 'string') return o; const l = this.state.lang; return o[l] ?? o.en ?? o.es ?? ''; }
  nm(it) { return (it.nm && this.tx(it.nm)) || it.name; } // guest-facing name in the current language
  fmt(n) { return n == null ? this.t('onRequest') : '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  fromFmt(p) { return this.tX('from').replace('{p}', this.fmt(p)); }
  item(id) { if (!this._map) { this._map = {}; this.props.items.forEach(i => { this._map[i.id] = i; }); } return this._map[id]; }
  catName(id) { const c = this.C.CATS.find(c => c.id === id); return c ? this.tx(c.n) : ''; }
  price(it, vi) { return it.v ? it.v[vi || 0].p : it.p; }
  norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  count(id) { return this.state.cart.filter(l => l.id === id).reduce((a, l) => a + l.qty, 0); }

  setLang(code) { try { localStorage.setItem('darksky.lang', code); } catch (e) {} this.setState({ lang: code, langOpen: false }); }
  enter() {
    this.setState({ phase: 'leaving' });
    this.scene && this.scene.enter();
    setTimeout(() => { this.setState({ phase: 'menu' }); this.scene && this.scene.setDim(this.dimVal()); setTimeout(() => this.loadTiles(), 120); }, 750);
  }
  showToast(msg) { this.setState({ toast: msg, toastOn: true }); clearTimeout(this._tt); this._tt = setTimeout(() => this.setState({ toastOn: false }), 1600); }
  addToCart(id, vi, qty) {
    this.setState(s => {
      const cart = s.cart.slice(); const k = cart.findIndex(l => l.id === id && l.vi === vi);
      if (k >= 0) cart[k] = { ...cart[k], qty: cart[k].qty + qty }; else cart.push({ id, vi, qty });
      return { cart, sent: false };
    });
    this.showToast(this.t('added') + ' · ' + this.nm(this.item(id)));
  }
  changeLine(i, d) { this.setState(s => { const cart = s.cart.slice(); const q = cart[i].qty + d; if (q <= 0) cart.splice(i, 1); else cart[i] = { ...cart[i], qty: q }; return { cart }; }); }
  openItem(id) { this.setState({ sheetId: id, vi: 0, qty: 1, cartOpen: false, langOpen: false, slide: 0 }); }
  // dishes of the open one's category, in menu order: the sheet steps through them (wrapping round)
  siblings(it) { return this.props.items.filter(i => i.cat === it.cat && !i.hidden); }
  stepItem(dir) {
    const cur = this.state.sheetId && this.item(this.state.sheetId); if (!cur) return;
    const list = this.siblings(cur), i = list.findIndex(x => x.id === cur.id); if (list.length < 2 || i < 0) return;
    this.setState({ sheetId: list[(i + dir + list.length) % list.length].id, vi: 0, qty: 1, slide: dir });
    if (this._sheetEl) this._sheetEl.scrollTop = 0;
  }
  quickAdd(id, e) { e && e.stopPropagation && e.stopPropagation(); const it = this.item(id); if (it.v) return this.openItem(id); this.addToCart(id, 0, 1); }

  segs(str) {
    return Array.from({ length: 10 }, (_, i) => {
      const n = i + 1, on = n >= Math.max(1, str[0]) && n <= str[1];
      return { bg: on ? `oklch(${0.8 - i * 0.025} 0.16 ${62 - i * 3.5})` : 'rgba(255,255,255,.1)' };
    });
  }
  mediaVm(it, ctl) {
    const src = it.media || (it.img ? '/api/img/' + it.img : ''), ext = (src.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
    const vid = ['mp4', 'webm', 'mov', 'm4v'].includes(ext), mdl = ['glb', 'gltf'].includes(ext);
    if (mdl) this.needModelViewer();
    return { mSrc: src, mImg: !!src && !vid && !mdl, mCut: !!it.cut || src.startsWith('/media/cut/'), mVideo: vid, mModel: mdl, mCtl: !!ctl, mPh: this.nm(it) };
  }
  needModelViewer() { if (this._mv) return; this._mv = 1; const s = document.createElement('script'); s.type = 'module'; s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js'; document.head.appendChild(s); }
  rowVm(it) {
    const c = this.count(it.id), d = this.tx(it.d), meta = this.tx(it.m);
    let price = this.fmt(it.p);
    if (it.v) { const ps = it.v.map(v => v.p), mn = Math.min(...ps), mx = Math.max(...ps); price = this.fmt(mn) + (mx > mn ? '+' : ''); }
    return { ...this.mediaVm(it), id: it.id, name: this.nm(it), desc: d, meta, price, hit: !!it.hit, isNew: !!it.new,
      inCart: c > 0, count: c, addBg: c ? '#e8793c' : '#111116', addColor: c ? '#050507' : '#f2f2f4',
      onOpen: () => this.openItem(it.id), onAdd: e => this.quickAdd(it.id, e) };
  }
  miniVm(it) { return { ...this.mediaVm(it), id: it.id, name: this.nm(it), cat: this.catName(it.cat), price: this.fmt(this.price(it, 0)), onOpen: () => this.openItem(it.id), onAdd: e => this.quickAdd(it.id, e) }; }

  vm() {
    const s = this.state, t = k => this.t(k);
    const langObj = D.LANGS.find(l => l.code === s.lang) || D.LANGS[0];
    const rtl = !!langObj.rtl;
    const hour = new Date().getHours();
    const live = w => !!w && hour >= w[0] && hour < w[1];
    const searching = s.searchOpen && s.q.trim().length > 0;
    const sec = s.view === 'section' ? this.C.SECTIONS.find(x => x.id === s.sec) : null;
    const cat = this.C.CATS.find(c => c.id === s.cat) || this.C.CATS[0];
    const kind = searching ? 'list' : !sec ? 'home' : (sec.kind || cat.kind || 'list');
    const SEC = id => this.C.SECTIONS.find(x => x.id === id);
    const secVm = (S, extra) => {
      const its = this.props.items.filter(i => S.cats.includes(i.cat)), ps = its.map(i => this.price(i, 0)).filter(p => p != null);
      const from = ps.length ? this.fromFmt(Math.min(...ps)) : '';
      return { id: S.id, name: this.tx(S.n), tag: this.tx(S.tag), from, count: its.length, big: '', row: 'auto', col: 'auto', border: 'rgba(255,255,255,.09)', ref: this.tileRef('tile-' + S.id, S.id), clip: S.clip, onOpen: e => this.nav('section', S.id, e), ...extra };
    };
    const bizLive = live([14, 17]);

    let items = [];
    if (searching) { const q = this.norm(s.q); items = this.props.items.filter(it => this.norm(it.name + ' ' + this.nm(it) + ' ' + this.tx(it.d) + ' ' + this.catName(it.cat)).includes(q)); }
    else if (kind === 'list') items = this.props.items.filter(it => it.cat === cat.id);

    const it = s.sheetId ? this.item(s.sheetId) : null;
    let sh = null, addLabel = '';
    if (it) {
      const pairs = (it.pair || D.PAIR[it.cat] || []).filter(id => id !== it.id).map(id => this.item(id)).filter(Boolean).map(p => this.miniVm(p));
      const variants = (it.v || []).map((v, i) => { const on = i === s.vi; return { name: this.tx(v.n), price: this.fmt(v.p), onPick: () => this.setState({ vi: i }), border: on ? 'rgba(232,121,60,.8)' : 'rgba(255,255,255,.1)', bg: on ? 'rgba(232,121,60,.1)' : 'rgba(255,255,255,.03)', ring: on ? '#e8793c' : 'rgba(255,255,255,.3)', dot: on ? '#e8793c' : 'transparent' }; });
      const sib = this.siblings(it), at = sib.findIndex(x => x.id === it.id);
      sh = { ...this.mediaVm(it, true), credit: PHOTO_CREDITS[it.media], pos: sib.length > 1 ? `${at + 1} / ${sib.length}` : '', id: it.id, name: this.nm(it), desc: this.tx(it.d), meta: this.tx(it.m), hit: !!it.hit, isNew: !!it.new, catName: this.catName(it.cat), tags: (it.t || []).map(k => this.tx(D.TASTE[k])), strLabel: it.str ? `${it.str[0]}–${it.str[1]} / 10` : '', segs: it.str ? this.segs(it.str) : null, variants, pairs };
      const p = this.price(it, s.vi);
      addLabel = p == null ? t('add') : `${t('add')} · ${this.fmt(p * s.qty)}`;
    }

    let sub = 0, onReq = false, cnt = 0;
    const lines = s.cart.map((l, i) => {
      const ci = this.item(l.id), p = this.price(ci, l.vi); cnt += l.qty; if (p == null) onReq = true; else sub += p * l.qty;
      return { key: l.id + ':' + l.vi, name: this.nm(ci), variant: ci.v ? this.tx(ci.v[l.vi].n) : '', qty: l.qty, total: this.fmt(p == null ? null : p * l.qty), onInc: () => this.changeLine(i, 1), onDec: () => this.changeLine(i, -1) };
    });
    const disc = s.cash ? Math.round(sub * 0.15) : 0;
    const inCart = new Set(s.cart.map(l => l.id)), seen = new Set(), suggest = [];
    s.cart.forEach(l => (D.PAIR[this.item(l.id).cat] || []).forEach(id => { if (!inCart.has(id) && !seen.has(id) && suggest.length < 5) { seen.add(id); const x = this.item(id); x && suggest.push(this.miniVm(x)); } }));
    const anySheet = !!it || s.cartOpen || s.langOpen;
    const R = this.C.RULES;

    return {
      rtl, flip: rtl ? 'scaleX(-1)' : 'none', langCode: s.lang, t, searching, sec, cat, kind, bizLive, live,
      langs: D.LANGS.map((l, i) => { const on = l.code === s.lang; return { code: l.code, name: l.name, sub: EN[l.code], on, last: i === D.LANGS.length - 1, onPick: () => this.setLang(l.code) }; }),
      cats: (sec ? sec.cats : []).map(id => this.C.CATS.find(c => c.id === id)).map(c => ({ id: c.id, name: this.tx(c.n), on: c.id === s.cat, onPick: () => this.setState({ cat: c.id }) })),
      hero: secVm(SEC('hookah')),
      tiles: [
        secVm(SEC('kitchen'), { row: 'span 2' }), secVm(SEC('cocktails')), secVm(SEC('tea')),
        secVm(SEC('bar')), secVm(SEC('soft')),
        secVm(SEC('promos'), { col: 'span 2', big: bizLive ? '−20%' : '−15%', border: 'rgba(232,121,60,.4)' }),
      ],
      hits: this.props.items.filter(i => i.hit).map(i => this.miniVm(i)),
      rulesName: this.tx(SEC('rules').n),
      hookahs: this.props.items.filter(i => i.cat === 'hookah').map(h => ({ ...this.rowVm(h), strLabel: h.str ? `${h.str[0]}–${h.str[1]} / 10` : '', segs: h.str ? this.segs(h.str) : null, tags: (h.t || []).map(k => this.tx(D.TASTE[k])), addBg: this.count(h.id) ? '#e8793c' : '#f2f2f4', addColor: '#050507' })),
      listTitle: searching ? '“' + s.q.trim() + '”' : this.tx(cat.n), items: items.map(x => this.rowVm(x)),
      promos: this.C.PROMOS.map(p => ({ tag: this.tx(p.tag), title: this.tx(p.title), big: p.big, desc: this.tx(p.d), live: live(p.window) })),
      promoNote: this.tx(this.C.PROMO_NOTE),
      rules: { peopleTitle: this.tx(R.peopleTitle), people: R.people.map(([g, n]) => ({ n, label: g + ' ' + this.tx(R.peopleUnit) })), info: R.info.map(x => this.tx(x)), noTitle: this.tx(R.noTitle), no: R.no.map(x => this.tx(x)), liability: this.tx(R.liability) },
      sh, addLabel, lines, suggest, cnt, onReq, anySheet,
      subtotal: this.fmt(sub), discount: '−' + this.fmt(disc), cartTotal: this.fmt(sub - disc),
    };
  }

  renderIntro() {
    const s = this.state, ready = s.ready;
    const t = k => (ready ? this.t(k) : '');
    return (
      <div style={css(`position:fixed;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;opacity:${s.phase === 'intro' ? 1 : 0};pointer-events:${s.phase === 'intro' ? 'auto' : 'none'};transition:opacity .7s ease`)}>
        {s.no3d && (
          <div style={css(`position:absolute;left:0;right:0;top:0;height:${s.logoFree || '55%'};display:flex;align-items:center;justify-content:center;padding:16px;pointer-events:none`)}>
            <img src={s.logoAlpha || this.props.logoUrl} alt="DARKSKY Hookah Lounge" style={css('max-width:min(78vw,380px);max-height:100%;object-fit:contain')} /> {/* eslint-disable-line @next/next/no-img-element */}
          </div>
        )}
        <div ref={this.introRef} style={css('width:100%;height:min(64vh,640px);display:flex;justify-content:center')}>
          <div style={css('width:100%;max-width:440px;height:100%;display:flex;flex-direction:column;padding:26px 16px calc(18px + env(safe-area-inset-bottom))')}>
            <div style={css('display:flex;flex-direction:column;align-items:center;gap:8px;padding-bottom:18px')}>
              <span style={css(`font:600 clamp(34px,10vw,44px)/1.05 Manrope,sans-serif;letter-spacing:-.02em;opacity:${s.gOn === false ? 0 : 1};transform:translateY(${s.gOn === false ? '8px' : '0px'});transition:opacity .5s ease, transform .6s cubic-bezier(.2,.8,.2,1);min-height:46px`)}>{GREET[s.gi % GREET.length]}</span>
              <span style={css('font:400 15px/1.3 Manrope,sans-serif;color:rgba(242,242,244,.7)')}>{t('chooseLang')}</span>
            </div>
            <div style={css('flex:1;min-height:0;overflow-y:auto;border-radius:18px;background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.03)), rgba(18,18,24,.42);border:1px solid rgba(255,255,255,.14);scrollbar-width:none' + GLASS)}>
              {ready && D.LANGS.map((l, i) => (
                <button key={l.code} className="ds-press-bg" onClick={() => this.setLang(l.code)} style={css('width:100%;min-height:58px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:transparent;transition:background .2s')}>
                  <span style={css(`flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;padding:10px 0;border-bottom:${i < D.LANGS.length - 1 ? '1px solid rgba(255,255,255,.08)' : '0'};text-align:start`)}>
                    <span style={css('font:500 16.5px/1.2 Manrope,sans-serif;color:#f2f2f4')}>{l.name}</span>
                    <span style={css('font:400 13px/1.2 Manrope,sans-serif;color:rgba(242,242,244,.5)')}>{EN[l.code]}</span>
                  </span>
                  <span style={css(`flex:none;width:22px;display:flex;justify-content:center;opacity:${l.code === s.lang ? 1 : 0};transition:opacity .2s`)}>
                    <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5l3.6 3.6L14.5 5" stroke="#e8793c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </button>
              ))}
            </div>
            <button className="ds-press" onClick={() => this.enter()} style={css('flex:none;height:54px;margin-top:14px;border-radius:14px;background:#f2f2f4;color:#050507;display:flex;align-items:center;justify-content:center;font:600 16px/1 Manrope,sans-serif')}>{t('enter')}</button>
            <div style={css('flex:none;padding-top:12px;font:500 11px/1 Manrope,sans-serif;letter-spacing:.12em;color:rgba(242,242,244,.45);text-align:center;text-transform:uppercase')}>{t('age')}</div>
          </div>
        </div>
      </div>
    );
  }

  renderHome(v) {
    const { t, hero } = v;
    return (
      <div style={css('display:flex;flex-direction:column;gap:10px')}>
        <div className="ds-press-hero" data-tile onClick={hero.onOpen} style={css('position:relative;overflow:hidden;height:300px;border-radius:26px;border:1px solid rgba(255,255,255,.1);background:radial-gradient(90% 120% at 78% 40%, rgba(232,121,60,.16), rgba(10,10,14,0) 62%), ' + GLASS_TINT + ';cursor:pointer;transition:transform .2s' + GLASS)}>
          {hero.clip
            ? <div style={css('position:absolute;inset:0;z-index:0')}><ProductClip src={hero.clip} v="full" fit={HERO_FIT} /></div>
            : <canvas ref={hero.ref} style={css('position:absolute;inset:0;width:100%;height:100%;display:block')} />}
          <div style={css('position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg, rgba(5,5,8,.5) 0%, rgba(5,5,8,.25) 42%, rgba(5,5,8,0) 66%)')} />
          <div style={css('position:absolute;inset:0;padding:20px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;max-width:64%')}>
            {v.bizLive
              ? <span style={css('align-self:flex-start;display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:10px;background:#e8793c;color:#050507;font:700 10.5px/1 Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase')}><span style={css('width:6px;height:6px;border-radius:50%;background:#050507')} />Business Hookah −20% · {t('now')}</span>
              : <span style={css('font:500 11px/1 Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:rgba(242,242,244,.6)')}>{t('prep')}</span>}
            <div style={css('display:flex;flex-direction:column;gap:10px')}>
              <span style={css('font:400 clamp(26px,7.4vw,34px)/1.05 Michroma,sans-serif;letter-spacing:.04em;text-transform:uppercase')}>{hero.name}</span>
              <span style={css('font:400 14px/1.45 Manrope,sans-serif;color:rgba(242,242,244,.78);text-wrap:pretty')}>{hero.tag}</span>
              <div style={css('display:flex;align-items:center;gap:10px;margin-top:6px')}>
                <span style={css('height:44px;padding:0 18px;border-radius:14px;background:#f2f2f4;color:#050507;display:flex;align-items:center;gap:10px;font:400 10.5px/1 Michroma,sans-serif;letter-spacing:.14em;text-transform:uppercase')}>{t('choose')}<Arrow size={14} flip={v.flip} /></span>
                <span style={css('font:600 13px/1.2 Manrope,sans-serif;color:rgba(242,242,244,.85)')}>{hero.from}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={css('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:176px;gap:10px')}>
          {v.tiles.map(tl => (
            <div key={tl.id} className="ds-press-tile" data-tile onClick={tl.onOpen} style={css(`position:relative;overflow:hidden;border-radius:22px;border:1px solid ${tl.border};background:radial-gradient(110% 80% at 60% 30%, rgba(232,121,60,.11), rgba(10,10,14,0) 65%), ${GLASS_TINT};grid-row:${tl.row};grid-column:${tl.col};cursor:pointer;transition:transform .2s${GLASS}`)}>
              {tl.clip
                ? <div style={css('position:absolute;inset:0;z-index:0')}><ProductClip src={tl.clip} v={tl.row === 'auto' ? 'sm' : 'full'} fit={tl.col === 'auto' ? TILE_FIT : WIDE_FIT} /></div>
                : <canvas ref={tl.ref} style={css('position:absolute;inset:0;width:100%;height:100%;display:block')} />}
              <div style={css('position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top, rgba(5,5,8,.6) 0%, rgba(5,5,8,.3) 34%, rgba(5,5,8,0) 58%)')} />
              {tl.big && <span style={css('position:absolute;top:16px;left:16px;font:400 30px/1 Michroma,sans-serif;color:#f2a676;pointer-events:none')}>{tl.big}</span>}
              {tl.count > 0 && <span style={css('position:absolute;top:12px;right:12px;min-width:30px;height:24px;padding:0 8px;border-radius:8px;background:rgba(5,5,8,.6);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font:600 11px/1 Manrope,sans-serif;color:rgba(242,242,244,.8);pointer-events:none')}>{tl.count}</span>}
              <div style={css('position:absolute;left:14px;right:14px;bottom:14px;display:flex;flex-direction:column;gap:6px;pointer-events:none')}>
                <span style={css('font:400 13px/1.2 Michroma,sans-serif;letter-spacing:.06em;text-transform:uppercase')}>{tl.name}</span>
                <span style={css('font:400 12px/1.35 Manrope,sans-serif;color:rgba(242,242,244,.7);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden')}>{tl.tag}</span>
                {tl.from && <span style={css('font:600 12.5px/1 Manrope,sans-serif;color:#f2f2f4;margin-top:2px')}>{tl.from}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:14px')}>
          <span style={css('font:400 11px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.75)')}>{this.tX('hits')}</span>
          <div style={css('display:flex;gap:10px;overflow-x:auto;margin:0 -16px;padding:0 16px 4px;scrollbar-width:none')}>
            {v.hits.map(p => <MiniCard key={p.id} p={p} w={164} mh={120} bg={GLASS_TINT_TEXT + GLASS} btn={38} />)}
          </div>
        </div>

        <button data-tile onClick={e => this.nav('section', 'rules', e)} style={css('margin-top:10px;min-height:56px;padding:0 18px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:' + GLASS_TINT_TEXT + ';display:flex;align-items:center;justify-content:space-between;gap:12px' + GLASS)}>
          <span style={css('display:flex;flex-direction:column;gap:5px')}>
            <span style={css('font:400 11px/1 Michroma,sans-serif;letter-spacing:.14em;text-transform:uppercase')}>{v.rulesName}</span>
            <span style={css('font:400 12.5px/1.3 Manrope,sans-serif;color:rgba(242,242,244,.6)')}>{t('lasts')} · 18+</span>
          </span>
          <Arrow size={16} w={1.5} flip={v.flip} />
        </button>
      </div>
    );
  }

  renderHookahs(v) {
    const { t } = v;
    return (
      <div style={css('display:flex;flex-direction:column;gap:12px')}>
        <button data-tile onClick={e => this.nav('section', 'promos', e)} style={css('position:relative;overflow:hidden;border-radius:18px;padding:16px 18px;border:1px solid rgba(232,121,60,.4);background:linear-gradient(120deg, rgba(232,121,60,.2), rgba(232,121,60,.04) 60%);display:flex;align-items:center;justify-content:space-between;gap:12px')}>
          <div style={css('display:flex;flex-direction:column;gap:7px')}>
            <div style={css('display:flex;align-items:center;gap:8px')}>
              <span style={css('font:400 11px/1 Michroma,sans-serif;letter-spacing:.14em;text-transform:uppercase')}>Business Hookah</span>
              {v.bizLive && <span style={css('font:700 10px/1 Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;border-radius:6px;background:#e8793c;color:#050507')}>{t('now')}</span>}
            </div>
            <span style={css('font:500 13px/1.35 Manrope,sans-serif;color:rgba(242,242,244,.8)')}>{t('businessSub')}</span>
          </div>
          <span style={css('font:400 22px/1 Michroma,sans-serif;color:#f2a676;white-space:nowrap')}>−20%</span>
        </button>
        {v.hookahs.map(h => (
          <div key={h.id} onClick={h.onOpen} style={css('position:relative;overflow:hidden;cursor:pointer;padding:0 20px 20px;border-radius:22px;border:1px solid rgba(255,255,255,.1);background:' + GLASS_TINT_TEXT + ';display:flex;flex-direction:column;gap:14px' + GLASS)}>
            <div style={css(`height:190px;margin:0 -20px;border-bottom:1px solid rgba(255,255,255,.08);${MEDIA_BG}`)}><Media m={h} /></div>
            <div style={css('display:flex;flex-direction:column;gap:8px')}>
              <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                <span style={css('font:400 20px/1.15 Michroma,sans-serif;letter-spacing:.04em;text-transform:uppercase')}>{h.name}</span>
                {h.hit && <Badge bg="#f2f2f4" color="#050507">{t('hit')}</Badge>}
              </div>
              <span style={css('font:400 13.5px/1.45 Manrope,sans-serif;color:rgba(242,242,244,.68);text-wrap:pretty')}>{h.desc}</span>
            </div>
            {h.segs && (
              <div style={css('display:flex;flex-direction:column;gap:8px')}>
                <div style={css('display:flex;justify-content:space-between;font:500 11px/1 Manrope,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(242,242,244,.6)')}><span>{t('strength')}</span><span>{h.strLabel}</span></div>
                <StrengthBar segs={h.segs} h={5} gap={4} r={3} />
              </div>
            )}
            <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px')}>
              <div style={css('display:flex;gap:6px;flex-wrap:wrap')}>
                {h.tags.map(tg => <span key={tg} style={css('font:500 11px/1 Manrope,sans-serif;padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.12);color:rgba(242,242,244,.75)')}>{tg}</span>)}
              </div>
              <div style={css('display:flex;align-items:center;gap:12px')}>
                <span style={css('font:600 17px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>{h.price}</span>
                <button onClick={h.onAdd} aria-label="Add" style={css(`width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${h.addBg};color:${h.addColor};font:700 14px/1 Manrope,sans-serif`)}>
                  {h.inCart ? h.count : <Plus />}
                </button>
              </div>
            </div>
          </div>
        ))}
        <div style={css('display:flex;justify-content:center;gap:10px;flex-wrap:wrap;font:500 12px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.6);padding:4px 0')}>
          <span>{t('lasts')}</span><span>·</span><span>{this.C.PREP ? this.tx(this.C.PREP) : t('prep')}</span>
        </div>
      </div>
    );
  }

  renderList(v) {
    const { t } = v;
    return (
      <div style={css('display:flex;flex-direction:column;background:' + GLASS_TINT_TEXT + ';border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:16px 16px 4px' + GLASS)}>
        <div style={css('display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:6px')}>
          <h2 style={css('margin:0;font:400 15px/1.3 Michroma,sans-serif;letter-spacing:.08em;text-transform:uppercase')}>{v.listTitle}</h2>
          <span style={css('font:500 12px/1 Manrope,sans-serif;color:rgba(242,242,244,.5)')}>{v.items.length || ''}</span>
        </div>
        {v.searching && v.items.length === 0 && <div style={css('padding:40px 0;text-align:center;font:400 14px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.6)')}>{t('noResults')}</div>}
        {v.items.map(it => (
          <div key={it.id} onClick={it.onOpen} style={css('display:grid;grid-template-columns:76px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.07);cursor:pointer')}>
            <div style={css(`width:76px;height:76px;border-radius:16px;border:1px solid rgba(255,255,255,.08);${MEDIA_BG}`)}><Media m={it} label={false} v="still" /></div>
            <div style={css('display:flex;flex-direction:column;gap:5px;min-width:0')}>
              <div style={css('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
                <span style={css('font:600 15px/1.3 Manrope,sans-serif;letter-spacing:.01em')}>{it.name}</span>
                {it.hit && <Badge bg="#f2f2f4" color="#050507" size={9.5} pad="4px 6px" radius={5}>{t('hit')}</Badge>}
                {it.isNew && <Badge bg="#e8793c" color="#050507" size={9.5} pad="4px 6px" radius={5}>{t('new')}</Badge>}
              </div>
              {it.desc && <span style={css('font:400 13px/1.45 Manrope,sans-serif;color:rgba(242,242,244,.62);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden')}>{it.desc}</span>}
              {it.meta && <span style={css('font:500 11.5px/1.3 Manrope,sans-serif;letter-spacing:.04em;color:rgba(242,242,244,.5)')}>{it.meta}</span>}
            </div>
            <div style={css('display:flex;align-items:center;gap:12px')}>
              <span style={css('font:600 14.5px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap')}>{it.price}</span>
              <button onClick={it.onAdd} aria-label="Add" style={css(`width:44px;height:44px;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;background:${it.addBg};color:${it.addColor};font:700 14px/1 Manrope,sans-serif`)}>
                {it.inCart ? it.count : <Plus size={15} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  renderPromos(v) {
    return (
      <div style={css('display:flex;flex-direction:column;gap:12px')}>
        {v.promos.map((p, i) => (
          <div key={i} style={css(`padding:22px 20px;border-radius:22px;border:1px solid ${p.live ? 'rgba(232,121,60,.55)' : 'rgba(255,255,255,.1)'};background:${GLASS_TINT_TEXT};display:flex;flex-direction:column;gap:10px${GLASS}`)}>
            <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
              <span style={css('font:500 11px/1 Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:rgba(242,242,244,.6)')}>{p.tag}</span>
              {p.live && <span style={css('font:700 10px/1 Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:4px 7px;border-radius:6px;background:#e8793c;color:#050507')}>{v.t('now')}</span>}
            </div>
            <span style={css('font:400 30px/1.1 Michroma,sans-serif;letter-spacing:.02em')}>{p.big}</span>
            <span style={css('font:600 15px/1.3 Manrope,sans-serif;text-transform:uppercase;letter-spacing:.06em')}>{p.title}</span>
            <span style={css('font:400 14px/1.45 Manrope,sans-serif;color:rgba(242,242,244,.7)')}>{p.desc}</span>
          </div>
        ))}
        <p style={css('margin:4px 4px 0;font:400 13px/1.5 Manrope,sans-serif;color:rgba(242,242,244,.6);text-wrap:pretty')}>{v.promoNote}</p>
      </div>
    );
  }

  renderRules(v) {
    const r = v.rules;
    return (
      <div style={css('display:flex;flex-direction:column;gap:22px')}>
        <div style={css('display:flex;flex-direction:column;gap:12px')}>
          <h3 style={css('margin:0;font:400 12px/1 Michroma,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,242,244,.75)')}>{r.peopleTitle}</h3>
          <div style={css('display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px')}>
            {r.people.map((p, i) => (
              <div key={i} style={css('padding:16px 8px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:' + GLASS_TINT_TEXT + ';display:flex;flex-direction:column;align-items:center;gap:8px' + GLASS)}>
                <span style={css('font:400 26px/1 Michroma,sans-serif')}>{p.n}</span>
                <span style={css('font:500 11px/1.3 Manrope,sans-serif;color:rgba(242,242,244,.65);text-align:center')}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={css('display:flex;flex-direction:column;gap:10px')}>
          {r.info.map((x, i) => <div key={i} style={css('display:flex;gap:12px;font:400 14px/1.5 Manrope,sans-serif;color:rgba(242,242,244,.82)')}><span style={css('flex:none;width:6px;height:6px;border-radius:50%;background:#e8793c;margin-top:8px')} /><span>{x}</span></div>)}
        </div>
        <div style={css('display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:' + GLASS_TINT_TEXT + GLASS)}>
          <h3 style={css('margin:0;font:400 12px/1 Michroma,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f2a676')}>{r.noTitle}</h3>
          {r.no.map((x, i) => <div key={i} style={css('display:flex;gap:12px;font:400 14px/1.45 Manrope,sans-serif;color:rgba(242,242,244,.82)')}><span style={css('flex:none;color:#f2a676;font-weight:600')}>×</span><span>{x}</span></div>)}
        </div>
        <p style={css('margin:0;font:400 12.5px/1.5 Manrope,sans-serif;color:rgba(242,242,244,.55)')}>{r.liability}</p>
      </div>
    );
  }

  renderMenu(v) {
    const s = this.state, { t, sec } = v;
    return (
      <div style={css(`position:relative;z-index:2;max-width:540px;margin:0 auto;min-height:100vh;padding-bottom:130px;opacity:${s.phase === 'menu' ? 1 : 0};transition:opacity .9s ease .15s`)}>
        <div style={css('position:sticky;top:0;z-index:4;background:rgba(34,35,42,.5);border-bottom:1px solid rgba(255,255,255,.06);padding-top:env(safe-area-inset-top)' + GLASS)}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px 10px 18px')}>
            {!sec ? (
              <button onClick={e => this.nav('home', null, e)} style={css('display:flex;flex-direction:column;gap:3px;align-items:flex-start')}>
                <span style={css('font:400 17px/1 Michroma,sans-serif;letter-spacing:.14em')}>DARKSKY</span>
                <span style={css('font:300 10px/1 Manrope,sans-serif;letter-spacing:.2em;color:rgba(242,242,244,.62);text-transform:uppercase;padding-inline-start:2px')}>Hookah Lounge</span>
              </button>
            ) : (
              <button onClick={e => this.nav('home', null, e)} style={css('height:44px;display:flex;align-items:center;gap:10px;padding-inline-end:10px')}>
                <span style={css('width:40px;height:40px;border-radius:14px;border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center')}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: v.flip }}><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span style={css('font:400 11px/1 Michroma,sans-serif;letter-spacing:.16em;text-transform:uppercase')}>{this.tX('back')}</span>
              </button>
            )}
            <div style={css('display:flex;align-items:center;gap:6px')}>
              <button onClick={() => this.setState(st => ({ searchOpen: !st.searchOpen, q: '' }))} aria-label="Search" style={css(`width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:${s.searchOpen ? 'rgba(255,255,255,.1)' : 'transparent'}`)}>
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
              <button onClick={() => this.setState({ langOpen: true, sheetId: null, cartOpen: false })} style={css('height:44px;padding:0 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;gap:8px')}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.2" /><path d="M1.8 8h12.4M8 1.7c1.8 1.8 2.6 4 2.6 6.3S9.8 12.5 8 14.3M8 1.7C6.2 3.5 5.4 5.7 5.4 8s.8 4.5 2.6 6.3" stroke="currentColor" strokeWidth="1.2" /></svg>
                <span style={css('font:400 10px/1 Michroma,sans-serif;letter-spacing:.1em;text-transform:uppercase')}>{v.langCode}</span>
              </button>
            </div>
          </div>
          {s.searchOpen && (
            <div style={css('padding:0 16px 10px')}>
              <input value={s.q} onChange={e => this.setState({ q: e.target.value })} placeholder={t('searchPh')} autoFocus style={css('width:100%;height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);padding:0 16px;font-size:15px;outline:none')} />
            </div>
          )}
          {!v.searching && sec && sec.cats.length > 1 && (
            <div style={css('display:flex;gap:8px;overflow-x:auto;padding:2px 16px 12px;scrollbar-width:none')}>
              {v.cats.map(c => (
                <button key={c.id} onClick={c.onPick} style={css(`flex:none;height:38px;padding:0 15px;border-radius:19px;border:1px solid ${c.on ? '#f2f2f4' : 'rgba(255,255,255,.12)'};background:${c.on ? '#f2f2f4' : 'rgba(255,255,255,.08)'};color:${c.on ? '#050507' : '#f2f2f4'};font:500 13px/1 Manrope,sans-serif;white-space:nowrap;transition:background .2s,color .2s`)}>{c.name}</button>
              ))}
            </div>
          )}
        </div>

        <div className="ds-page" style={css(`padding:16px 16px 0;display:flex;flex-direction:column;gap:18px;${s.leaving
          ? 'opacity:0;transform:scale(1.035);filter:blur(7px);transition:opacity .24s ease-in, transform .24s ease-in, filter .24s ease-in'
          : `opacity:${s.contentOn ? 1 : 0};transform:${s.contentOn ? 'none' : 'translateY(10px) scale(.985)'};filter:${s.contentOn ? 'none' : 'blur(8px)'};transition:opacity .45s ease, transform .5s cubic-bezier(.2,.8,.2,1), filter .45s ease`}`)}>
          {v.kind === 'home' && this.renderHome(v)}
          {!v.searching && sec && sec.id !== 'rules' && (
            <div style={css('position:relative;overflow:hidden;height:168px;border-radius:24px;border:1px solid rgba(255,255,255,.1);background:radial-gradient(90% 140% at 80% 40%, rgba(232,121,60,.15), rgba(10,10,14,0) 60%), ' + GLASS_TINT + GLASS)}>
              {sec.clip
                ? <div style={css('position:absolute;inset:0;z-index:0')}><ProductClip src={sec.clip} v="full" fit={HERO_FIT} /></div>
                : <canvas ref={this.tileRef('banner-' + sec.id, sec.id)} style={css('position:absolute;inset:0;width:100%;height:100%;display:block')} />}
              <div style={css('position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg, rgba(5,5,8,.5) 0%, rgba(5,5,8,.2) 50%, rgba(5,5,8,0) 72%)')} />
              <div style={css('position:absolute;left:18px;bottom:18px;max-width:62%;display:flex;flex-direction:column;gap:8px;pointer-events:none')}>
                <span style={css('font:400 22px/1.1 Michroma,sans-serif;letter-spacing:.04em;text-transform:uppercase')}>{this.tx(sec.n)}</span>
                <span style={css('font:400 13px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.75)')}>{this.tx(sec.tag)}</span>
              </div>
            </div>
          )}
          {v.kind === 'hookah' && this.renderHookahs(v)}
          {v.kind === 'list' && this.renderList(v)}
          {v.kind === 'promos' && this.renderPromos(v)}
          {v.kind === 'rules' && this.renderRules(v)}
        </div>
      </div>
    );
  }

  renderItemSheet(v) {
    const s = this.state, sh = v.sh, { t } = v;
    if (!sh) return null;
    return (
      <div key={sh.id} className={s.slide > 0 ? 'ds-in-r' : s.slide < 0 ? 'ds-in-l' : ''} style={css('padding:10px 20px 0;display:flex;flex-direction:column;gap:20px')}>
        {/* pinned to the sheet's top-right corner while the content scrolls */}
        <div style={css('position:sticky;top:0;z-index:5;height:0;margin-bottom:-20px')}>
          <button onClick={() => this.closeAll()} aria-label="Close" style={css('position:absolute;top:12px;right:-6px;' + CLOSE_BTN)}><Close /></button>
        </div>
        <Grip />
        <div style={css(`height:min(42vh,72vw);width:100%;flex:none;border-radius:22px;border:1px solid rgba(255,255,255,.08);${MEDIA_BG}`)}>
          <Media m={sh} />
          {sh.pos && <>
            <button onClick={() => this.stepItem(-1)} aria-label="Previous" style={css('left:10px;' + STEP_BTN)}><Arrow size={16} flip="scaleX(-1)" /></button>
            <button onClick={() => this.stepItem(1)} aria-label="Next" style={css('right:10px;' + STEP_BTN)}><Arrow size={16} /></button>
            <span style={css('position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:2;padding:5px 10px;border-radius:10px;background:rgba(5,5,8,.5);font:600 11px/1 Manrope,sans-serif;letter-spacing:.06em;color:rgba(242,242,244,.85);pointer-events:none')}>{sh.pos}</span>
          </>}
        </div>
        {sh.credit && <div style={css('margin-top:-8px;font:400 10.5px/1.35 Manrope,sans-serif;color:rgba(242,242,244,.38)')}>© {sh.credit}</div>}
        <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
          <div style={css('display:flex;flex-direction:column;gap:10px;min-width:0')}>
            <div style={css('display:flex;gap:6px')}>
              {sh.hit && <Badge bg="#f2f2f4" color="#050507">{t('hit')}</Badge>}
              {sh.isNew && <Badge bg="#e8793c" color="#050507">{t('new')}</Badge>}
              <span style={css('font:500 11px/1 Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:rgba(242,242,244,.55);padding:4px 0')}>{sh.catName}</span>
            </div>
            <h2 style={css('margin:0;font:400 22px/1.25 Michroma,sans-serif;letter-spacing:.03em;text-transform:uppercase;text-wrap:balance')}>{sh.name}</h2>
            {sh.meta && <span style={css('font:500 12px/1 Manrope,sans-serif;letter-spacing:.06em;color:rgba(242,242,244,.55)')}>{sh.meta}</span>}
          </div>
          
        </div>
        {sh.desc && <p style={css('margin:0;font:400 15px/1.6 Manrope,sans-serif;color:rgba(242,242,244,.78);text-wrap:pretty')}>{sh.desc}</p>}

        {sh.segs && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            <div style={css('display:flex;justify-content:space-between;font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.6)')}><span>{t('strength')}</span><span>{sh.strLabel}</span></div>
            <StrengthBar segs={sh.segs} h={8} gap={5} r={4} />
          </div>
        )}

        {sh.tags.length > 0 && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            <span style={css('font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.6)')}>{t('taste')}</span>
            <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
              {sh.tags.map(tg => <span key={tg} style={css('font:500 13px/1 Manrope,sans-serif;padding:9px 13px;border-radius:12px;border:1px solid rgba(232,121,60,.35);background:rgba(232,121,60,.08);color:#f6c3a3')}>{tg}</span>)}
            </div>
          </div>
        )}

        {sh.variants.length > 0 && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            <span style={css('font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.6)')}>{t('choose')}</span>
            <div style={css('display:flex;flex-direction:column;gap:6px')}>
              {sh.variants.map((vr, i) => (
                <button key={i} onClick={vr.onPick} style={css(`min-height:50px;padding:0 16px;border-radius:14px;border:1px solid ${vr.border};background:${vr.bg};display:flex;align-items:center;justify-content:space-between;gap:12px;transition:background .2s,border-color .2s`)}>
                  <span style={css('display:flex;align-items:center;gap:12px')}>
                    <span style={css(`width:18px;height:18px;border-radius:50%;border:1.5px solid ${vr.ring};display:flex;align-items:center;justify-content:center`)}><span style={css(`width:8px;height:8px;border-radius:50%;background:${vr.dot}`)} /></span>
                    <span style={css('font:500 14.5px/1.2 Manrope,sans-serif')}>{vr.name}</span>
                  </span>
                  <span style={css('font:600 14px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>{vr.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sh.pairs.length > 0 && (
          <div style={css('display:flex;flex-direction:column;gap:10px')}>
            <span style={css('font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.6)')}>{t('pairs')}</span>
            <div style={css('display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:0 20px 4px;scrollbar-width:none')}>
              {sh.pairs.map(p => <MiniCard key={p.id} p={p} w={156} mh={100} bg="#111116" btn={36} />)}
            </div>
          </div>
        )}

        <div style={css('position:sticky;bottom:0;z-index:3;margin:0 -20px;padding:14px 20px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(to top, rgba(13,13,18,1) 70%, rgba(13,13,18,0));display:flex;gap:10px')}>
          <div style={css('display:flex;align-items:center;border-radius:16px;border:1px solid rgba(255,255,255,.14);height:58px')}>
            <button onClick={() => this.setState(st => ({ qty: Math.max(1, st.qty - 1) }))} aria-label="−" style={css('width:46px;height:58px;display:flex;align-items:center;justify-content:center;font:400 20px/1 Manrope,sans-serif')}>−</button>
            <span style={css('min-width:22px;text-align:center;font:600 16px/1 Manrope,sans-serif')}>{s.qty}</span>
            <button onClick={() => this.setState(st => ({ qty: Math.min(20, st.qty + 1) }))} aria-label="+" style={css('width:46px;height:58px;display:flex;align-items:center;justify-content:center;font:400 20px/1 Manrope,sans-serif')}>+</button>
          </div>
          <button className="ds-press" onClick={() => { this.addToCart(sh.id, s.vi, s.qty); this.setState({ sheetId: null }); }} style={css('flex:1;height:58px;border-radius:16px;background:#f2f2f4;color:#050507;font:700 15px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums;text-align:center')}>{v.addLabel}</button>
        </div>
      </div>
    );
  }

  renderCart(v) {
    const s = this.state, { t } = v;
    const empty = !s.sent && v.lines.length === 0, body = !s.sent && v.lines.length > 0;
    return (
      <div style={css('padding:10px 20px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:18px')}>
        <Grip />
        <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px')}>
          <h2 style={css('margin:0;font:400 18px/1.2 Michroma,sans-serif;letter-spacing:.06em;text-transform:uppercase')}>{t('order')}</h2>
          <button onClick={() => this.closeAll()} aria-label="Close" style={css(CLOSE_BTN)}><Close /></button>
        </div>

        {s.sent && (
          <div style={css('display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 0 8px;text-align:center')}>
            <div style={css('width:72px;height:72px;border-radius:50%;border:1px solid rgba(232,121,60,.6);background:rgba(232,121,60,.12);display:flex;align-items:center;justify-content:center')}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14.5l5.5 5.5L22 9" stroke="#f2a676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={css('font:400 18px/1.3 Michroma,sans-serif;letter-spacing:.04em;text-transform:uppercase')}>{t('sent')}</span>
            <span style={css('font:400 15px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.72)')}>{s.orderStatus === 'served' ? this.tO('served') : s.orderStatus === 'accepted' ? this.tO('accepted') : t('sentSub')} · {t('table')} {this.props.table && this.props.table.number}</span>
            <button onClick={() => this.newOrder()} style={css('margin-top:10px;height:52px;padding:0 24px;border-radius:16px;border:1px solid rgba(255,255,255,.18);font:600 14px/1 Manrope,sans-serif')}>{t('newOrder')}</button>
          </div>
        )}

        {empty && <div style={css('padding:30px 0;text-align:center;font:400 15px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.6)')}>{t('empty')}</div>}

        {body && (
          <>
            <div style={css('display:flex;flex-direction:column')}>
              {v.lines.map(ln => (
                <div key={ln.key} style={css('display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.07)')}>
                  <div style={css('display:flex;flex-direction:column;gap:4px;min-width:0')}>
                    <span style={css('font:600 14.5px/1.3 Manrope,sans-serif')}>{ln.name}</span>
                    {ln.variant && <span style={css('font:400 12.5px/1.3 Manrope,sans-serif;color:rgba(242,242,244,.6)')}>{ln.variant}</span>}
                    <span style={css('font:600 13px/1 Manrope,sans-serif;color:rgba(242,242,244,.85);font-variant-numeric:tabular-nums;margin-top:2px')}>{ln.total}</span>
                  </div>
                  <div style={css('display:flex;align-items:center;border-radius:14px;border:1px solid rgba(255,255,255,.14);height:44px')}>
                    <button onClick={ln.onDec} aria-label={ln.qty > 1 ? '−' : 'Remove'} style={css('width:40px;height:44px;display:flex;align-items:center;justify-content:center;font:400 18px/1 Manrope,sans-serif')}>
                      {ln.qty > 1 ? '−' : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#f2a676" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.8v4M9.2 6.8v4" /></svg>}
                    </button>
                    <span style={css('min-width:18px;text-align:center;font:600 14px/1 Manrope,sans-serif')}>{ln.qty}</span>
                    <button onClick={ln.onInc} style={css('width:40px;height:44px;font:400 18px/1 Manrope,sans-serif;text-align:center')}>+</button>
                  </div>
                </div>
              ))}
            </div>

            {v.suggest.length > 0 && (
              <div style={css('display:flex;flex-direction:column;gap:10px')}>
                <span style={css('font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.6)')}>{t('suggest')}</span>
                <div style={css('display:flex;gap:10px;overflow-x:auto;margin:0 -20px;padding:0 20px 4px;scrollbar-width:none')}>
                  {v.suggest.map(p => <MiniCard key={p.id} p={{ ...p, onOpen: null }} w={156} mh={100} bg="#111116" btn={36} />)}
                </div>
              </div>
            )}

            <button onClick={() => this.setState(st => ({ cash: !st.cash }))} style={css('display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:#101015')}>
              <span style={css('font:500 14px/1.35 Manrope,sans-serif')}>{t('cash')}</span>
              <span style={css(`flex:none;width:46px;height:28px;border-radius:14px;background:${s.cash ? '#e8793c' : 'rgba(255,255,255,.18)'};position:relative;transition:background .2s`)}>
                <span style={css(`position:absolute;top:3px;left:${s.cash ? '21px' : '3px'};width:22px;height:22px;border-radius:50%;background:#f2f2f4;transition:left .2s`)} />
              </span>
            </button>

            {this.props.table && (
              <div style={css('display:flex;align-items:center;justify-content:space-between;gap:14px')}>
                <span style={css('font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.7)')}>{t('table')}</span>
                <span style={css('min-width:64px;height:48px;padding:0 16px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font:600 18px/1 Manrope,sans-serif')}>{this.props.table.number}</span>
              </div>
            )}

            <div style={css('display:flex;flex-direction:column;gap:8px;padding-top:4px;font:500 14px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>
              <div style={css('display:flex;justify-content:space-between;color:rgba(242,242,244,.7)')}><span>{t('subtotal')}</span><span>{v.subtotal}</span></div>
              {s.cash && <div style={css('display:flex;justify-content:space-between;color:#f2a676')}><span>{t('discount')} −15%</span><span>{v.discount}</span></div>}
              <div style={css('display:flex;justify-content:space-between;align-items:baseline;padding-top:6px;font:700 20px/1 Manrope,sans-serif')}><span style={css('font:400 13px/1 Michroma,sans-serif;letter-spacing:.12em;text-transform:uppercase')}>{t('total')}</span><span>{v.cartTotal}</span></div>
              {v.onReq && <span style={css('font:400 12px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.55)')}>+ {t('onRequest')}</span>}
            </div>

            {s.sendErr && <div role="alert" style={css('padding:12px 14px;border-radius:14px;border:1px solid rgba(232,121,60,.5);background:rgba(232,121,60,.1);font:500 14px/1.4 Manrope,sans-serif;color:#f6c3a3')}>{this.tO(s.sendErr)}</div>}
            {this.props.table ? (
              <button className="ds-press" onClick={() => this.setState({ cartOpen: false, reviewOpen: true, sendErr: '' })} style={css('height:60px;border-radius:18px;background:#f2f2f4;color:#050507;display:flex;align-items:center;justify-content:center;gap:12px;font:400 12px/1 Michroma,sans-serif;letter-spacing:.16em;text-transform:uppercase')}>
                <span>{this.tO('checkout')}</span>
                <Arrow w={1.5} flip={v.flip} />
              </button>
            ) : (
              <div style={css('padding:16px;border-radius:18px;border:1px dashed rgba(255,255,255,.2);text-align:center;font:500 14px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.75)')}>{this.tO('scanQr')}</div>
            )}
          </>
        )}
      </div>
    );
  }

  closeAll() { this.setState({ sheetId: null, cartOpen: false, langOpen: false }); }
  tO(k) { const U = D.UI_ORDER; return (U[this.state.lang] || U.en)[k]; }

  async sendOrder() {
    const s = this.state, table = this.props.table;
    if (!table || s.sending || !s.cart.length) return;
    this.setState({ sending: true, sendErr: '' });
    try {
      const r = await fetch('/api/orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: table.token, lines: s.cart.map(l => ({ id: l.id, vi: l.vi, qty: l.qty })), cash: s.cash, lang: s.lang, note: s.note }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const err = j.error === 'rate' ? 'wait' : j.error === 'unavailable' ? 'unavailable' : 'sendFail';
        return this.setState({ sending: false, sendErr: err });
      }
      this.setState({ sending: false, sent: true, orderId: j.id, orderStatus: j.status || 'new' });
      this.pollOrder(j.id);
    } catch (e) {
      this.setState({ sending: false, sendErr: 'sendFail' });
    }
  }
  // Staff accept / serve / edit it (staff page or Telegram) → the guest sees it here.
  pollOrder(id) {
    clearInterval(this._poll);
    const started = Date.now();
    this._poll = setInterval(async () => {
      if (this.state.orderId !== id || Date.now() - started > 45 * 60e3) return clearInterval(this._poll);
      try {
        const r = await fetch(`/api/orders/${id}?t=${encodeURIComponent(this.props.table.token)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const o = await r.json();
        this.setState({ orderStatus: o.status, orderView: o });
        if (o.status === 'served') clearInterval(this._poll);
      } catch (e) { /* offline for a moment: try again next tick */ }
    }, 4000);
  }
  newOrder() { clearInterval(this._poll); this.setState({ cart: [], sent: false, cartOpen: false, reviewOpen: false, cash: false, note: '', orderId: null, orderStatus: null, orderView: null, sendErr: '' }); }

  // Full-screen order: before sending — the cart as it stands; after — the order as the staff see it now.
  reviewVm(v) {
    const s = this.state, o = s.sent && s.orderView;
    const lines = o ? o.lines.map((l, i) => {
      const ci = this.item(l.id);
      return { key: i, name: ci ? this.nm(ci) : l.id, variant: ci && ci.v && l.vi != null && ci.v[l.vi] ? this.tx(ci.v[l.vi].n) : l.variant, qty: l.qty, total: this.fmt(l.total) };
    }) : v.lines;
    return {
      open: !!s.reviewOpen && lines.length > 0, t: v.t, tO: k => this.tO(k), flip: v.flip, table: this.props.table ? this.props.table.number : '',
      lines, sent: !!s.sent, status: s.orderStatus, by: o ? o.by : null, edited: !!(o && o.edited),
      subtotal: o ? this.fmt(o.subtotal) : v.subtotal, discount: o ? '−' + this.fmt(o.discount) : v.discount, total: o ? this.fmt(o.total) : v.cartTotal,
      hasDiscount: o ? o.discount > 0 : s.cash, onReq: o ? o.onRequest : v.onReq,
      cash: s.cash, onCash: () => this.setState(st => ({ cash: !st.cash })), note: s.note || '', onNote: note => this.setState({ note }),
      sending: s.sending, err: s.sendErr ? this.tO(s.sendErr) : '', onSend: () => this.sendOrder(),
      onBack: () => this.setState({ reviewOpen: false, cartOpen: true }), onClose: () => this.setState({ reviewOpen: false }), onNew: () => this.newOrder(),
    };
  }

  render() {
    // the intro needs the logo first: fetch it together with the scripts, not after them
    preload(this.props.logoUrl, { as: 'image', fetchPriority: 'high' });
    const s = this.state;
    const v = s.ready ? this.vm() : null;
    const sheetWrap = y => css(`position:fixed;left:0;right:0;bottom:0;z-index:8;display:flex;justify-content:center;pointer-events:none;transform:translateY(${y});transition:transform .45s cubic-bezier(.2,.8,.2,1)`);
    return (
      <div dir={v && v.rtl ? 'rtl' : 'ltr'} style={css('position:relative;min-height:100vh;background:#030305;color:#f2f2f4;overflow-x:hidden')}>
        <canvas ref={this.canvasRef} style={css('position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;background:radial-gradient(80% 50% at 50% 100%, rgba(232,121,60,.18), rgba(3,3,5,0) 70%), #030305')} />

        {/* Crisp logo at native resolution: fades in over the particle lettering once the smoke has condensed into it */}
        {s.logoBox && s.logoAlpha && !s.no3d && s.phase !== 'menu' && !this.props.skipIntro && (
          <img src={s.logoAlpha} alt="DARKSKY Hookah Lounge" style={css(`position:fixed;${s.logoBox};z-index:1;pointer-events:none;opacity:${s.logoOn && s.phase === 'intro' ? 1 : 0};transition:opacity ${s.phase === 'intro' ? '.9s' : '.3s'} ease`)} /> /* eslint-disable-line @next/next/no-img-element */
        )}

        {s.phase !== 'menu' && !this.props.skipIntro && this.renderIntro()}

        {v && s.phase !== 'intro' && (
          <>
            {this.renderMenu(v)}
            {v.cnt > 0 && !v.anySheet && s.phase === 'menu' && (
              <div style={css('position:fixed;left:0;right:0;bottom:0;z-index:6;display:flex;justify-content:center;padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(to top, rgba(3,3,5,.9), rgba(3,3,5,0))')}>
                <button onClick={() => this.setState(s.sent && this.props.table ? { reviewOpen: true } : { cartOpen: true })} style={css('width:100%;max-width:508px;height:60px;border-radius:18px;background:#f2f2f4;color:#050507;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 10px 0 20px;box-shadow:0 10px 40px rgba(232,121,60,.25)')}>
                  <span style={css('font:400 11px/1 Michroma,sans-serif;letter-spacing:.14em;text-transform:uppercase')}>{v.t('viewOrder')}</span>
                  <span style={css('display:flex;align-items:center;gap:10px')}>
                    <span style={css('font:700 15px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>{v.cartTotal}</span>
                    <span style={css('min-width:40px;height:40px;padding:0 10px;border-radius:12px;background:#050507;color:#f2f2f4;display:flex;align-items:center;justify-content:center;font:700 14px/1 Manrope,sans-serif')}>{v.cnt}</span>
                  </span>
                </button>
              </div>
            )}
          </>
        )}

        <div style={css(`position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom));z-index:9;transform:translateX(-50%) translateY(${s.toastOn ? '0px' : '10px'});opacity:${s.toastOn ? 1 : 0};transition:opacity .3s, transform .3s;pointer-events:none;padding:11px 16px;border-radius:14px;background:#14141a;border:1px solid rgba(255,255,255,.12);font:500 13px/1 Manrope,sans-serif;white-space:nowrap;display:flex;align-items:center;gap:8px`)}>
          <span style={css('width:7px;height:7px;border-radius:50%;background:#e8793c')} /><span>{s.toast}</span>
        </div>

        {v && (
          <>
            <div onClick={() => this.closeAll()} style={css(`position:fixed;inset:0;z-index:7;touch-action:none;background:rgba(0,0,0,.55);opacity:${v.anySheet ? 1 : 0};pointer-events:${v.anySheet ? 'auto' : 'none'};transition:opacity .35s ease`)} />

            <div style={sheetWrap(v.sh ? '0%' : '110%')}>
              <div ref={this.dragRef('item')} style={css('pointer-events:auto;width:100%;max-width:540px;max-height:88dvh;overflow-y:auto;overscroll-behavior:contain;border-radius:26px 26px 0 0;border:1px solid rgba(255,255,255,.1);border-bottom:0;background:#0d0d12')}>
                {this.renderItemSheet(v)}
              </div>
            </div>

            <div style={sheetWrap(s.cartOpen ? '0%' : '110%')}>
              <div ref={this.dragRef('cart')} style={css('pointer-events:auto;width:100%;max-width:540px;max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;border-radius:26px 26px 0 0;border:1px solid rgba(255,255,255,.1);border-bottom:0;background:#0d0d12')}>
                {this.renderCart(v)}
              </div>
            </div>

            <div style={sheetWrap(s.langOpen ? '0%' : '110%')}>
              <div ref={this.dragRef('lang')} style={css('pointer-events:auto;width:100%;max-width:540px;border-radius:26px 26px 0 0;border:1px solid rgba(255,255,255,.12);border-bottom:0;background:rgba(18,18,24,.62);padding:10px 20px calc(22px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:16px' + GLASS)}>
                <Grip />
                <span style={css('font:400 12px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;text-align:center')}>{v.t('language')}</span>
                <div style={css('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px')}>
                  {v.langs.map(l => (
                    <button key={l.code} onClick={l.onPick} style={css(`height:50px;padding:0 14px;border-radius:14px;border:1px solid ${l.on ? 'rgba(232,121,60,.85)' : 'rgba(255,255,255,.12)'};background:${l.on ? 'rgba(232,121,60,.16)' : 'rgba(255,255,255,.06)'};display:flex;align-items:center;justify-content:space-between;gap:8px`)}>
                      <span style={css('font:500 14.5px/1 Manrope,sans-serif')}>{l.name}</span>
                      <span style={css('font:400 9px/1 Michroma,sans-serif;letter-spacing:.12em;color:rgba(242,242,244,.55);text-transform:uppercase')}>{l.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {this.props.table && <OrderReview r={this.reviewVm(v)} />}
          </>
        )}
      </div>
    );
  }
}
