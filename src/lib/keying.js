// Cutting a plain backdrop out of a video frame: used by scripts/key-videos.mjs and by the admin's clip uploads
// (clip-worker.js). Keying is by hue rather than ffmpeg's chromakey: see the notes in the script.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return [0, 0, mx / 255];
  let h = mx === r ? (g - b) / d : mx === g ? 2 + (b - r) / d : 4 + (r - g) / d;
  h *= 60; if (h < 0) h += 360;
  return [h, d / mx, mx / 255];
}

// The screen colour: the most common saturated green hue along the frame border.
export function sampleKey(px, W, H, hc = 130, span = 60) {
  const bins = new Float64Array(360), sats = [];
  const take = (x, y) => {
    const i = (y * W + x) * 3, [h, s, v] = hsv(px[i], px[i + 1], px[i + 2]);
    if (s > .25 && v > .12 && hueGap(h, hc) < span) { bins[Math.round(h) % 360]++; sats.push([h, s, v, (.3 * px[i] + .59 * px[i + 1] + .11 * px[i + 2]) / 255]); }
  };
  const m = Math.round(W * .05);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < m; x += 2) { take(x, y); take(W - 1 - x, y); }
  for (let x = 0; x < W; x += 2) for (let y = 0; y < m; y += 2) { take(x, y); take(x, H - 1 - y); }
  let best = 0, hk = 0;
  for (let h = 0; h < 360; h++) { let s = 0; for (let k = -4; k <= 4; k++) s += bins[(h + k + 360) % 360]; if (s > best) { best = s; hk = h; } }
  const near = sats.filter(([h]) => Math.abs(h - hk) < 10), mid = (k, i) => near.map(x => x[i]).sort((a, b) => a - b)[near.length >> 1] ?? k;
  return { hk, sk: mid(.6, 1), vk: mid(.5, 2), lk: mid(.4, 3) };
}

// hue: scales how far from the screen's hue still counts as screen (>1 cuts more, <1 keeps more)
export function keyFrame(px, out, alpha, tmp, key, { sat = 1, hue = 1, smoke = false, shadow = 1, feather = null, lift = 0, grey = null } = {}, W, H) {
  const { hk, sk, vk, lk } = key, n = W * H;
  for (let p = 0; p < n; p++) {
    const i = p * 3, r = px[i], g = px[i + 1], b = px[i + 2];
    const [h, s, v] = hsv(r, g, b);
    let dh = Math.abs(h - hk); if (dh > 180) dh = 360 - dh;
    // in the dark (shadows on the screen, a glossy black plate reflecting it) hue is noisy: widen the tolerance
    const dark = smooth(.15, .65, 1 - v / vk), tol = 1 + dark;
    const st = sat + (1 - sat) * dark; // per-clip saturation tweak applies to the lit screen only, not to dark objects
    let k = (1 - smooth(18 * tol * hue, 34 * tol * hue, dh)) * smooth(.22 * st * sk / tol, .5 * st * sk / tol, s); // screen-like → background
    if (smoke) k = Math.max(k, smooth(.45, .65, v) * (1 - smooth(.12, .3, s)));
    // ...but whatever is darker than the screen stays as a soft black shadow instead of a ragged cut-out
    const sh = shadow === 'black' ? (1 - smooth(.06, .17, v)) * .95 : Math.min(.97, dark * .8 * shadow);
    tmp[p] = k * (1 - sh);                                    // transparency
    // despill, only for colours close to the screen hue: pull green down, then neutralise what is left
    // (smoke and glass over the screen would otherwise stay cyan)
    const spill = (1 - smooth(25, 50, dh)) * .85, lim = Math.max(r, b), g2 = g > lim ? g - (g - lim) * spill : g;
    const lum = lift && k > .15 ? Math.max(.3 * r + .59 * g2 + .11 * b, lift) : .3 * r + .59 * g2 + .11 * b, ks = (lift && k > .15) || (grey && h > grey[0] && h < grey[1]) ? 1 : spill * .8; // grey: a hue range to take the colour out of (the screen seen through a drink)
    // the shadow part of a pixel is black: straight colour = foreground share / total opacity
    const fg = 1 - k, keep = fg / Math.max(1e-3, fg + k * sh);
    const o = p * 4;
    out[o] = (r + (lum - r) * ks) * keep; out[o + 1] = (g2 + (lum - g2) * ks) * keep; out[o + 2] = (b + (lum - b) * ks) * keep;
  }
  // soften the matte a little (3×3 box) and snap near-solid values, which also helps compression
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; s += tmp[yy * W + xx]; c++; } }
    let a = 1 - s / c;
    if (feather) a *= smooth(0, feather[0] * W, Math.min(x, W - 1 - x)) * smooth(0, feather[1] * H, Math.min(y, H - 1 - y));
    a = a < .04 ? 0 : a > .96 ? 1 : a;
    alpha[y * W + x] = a;
    const o = (y * W + x) * 4;
    if (!a) out[o] = out[o + 1] = out[o + 2] = 0; // nothing to encode where it is fully transparent
    out[o + 3] = Math.round(a * 255);
  }
}

const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

// What is behind the subject, from the frame's border: { hue: key } for a coloured screen, { flat: [r, g, b] } for
// white, grey or black, null when the border is not one colour (nothing can be cut out reliably)
export function sampleBackdrop(px, W, H) {
  const pts = [], at = (x, y) => { const i = (y * W + x) * 3; pts.push([px[i], px[i + 1], px[i + 2]]); };
  const m = Math.max(2, Math.round(W * .03));
  for (let y = 0; y < H; y += 4) for (let x = 0; x < m; x += 2) { at(x, y); at(W - 1 - x, y); }
  for (let x = 0; x < W; x += 4) for (let y = 0; y < m; y += 2) { at(x, y); at(x, H - 1 - y); }
  const mid = k => pts.map(p => p[k]).sort((a, b) => a - b)[pts.length >> 1], c = [mid(0), mid(1), mid(2)];
  const near = pts.filter(p => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 60).length;
  if (near / pts.length < .6) return null;
  const [h, s, v] = hsv(c[0], c[1], c[2]);
  return s > .25 && v > .12 ? { hue: sampleKey(px, W, H, h, 30) } : { flat: c };
}

// A white, grey or black backdrop has no hue to go by: distance from its colour, softened like keyFrame's matte
// tol scales the colour distance still taken for the backdrop (>1 cuts more)
export function keyFlat(px, out, alpha, tmp, c, feather, W, H, tol = 1) {
  const n = W * H;
  for (let p = 0; p < n; p++) { const i = p * 3; tmp[p] = 1 - smooth(24 * tol, 64 * tol, Math.hypot(px[i] - c[0], px[i + 1] - c[1], px[i + 2] - c[2])); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; s += tmp[yy * W + xx]; k++; } }
    let a = 1 - s / k;
    if (feather) a *= smooth(0, feather[0] * W, Math.min(x, W - 1 - x)) * smooth(0, feather[1] * H, Math.min(y, H - 1 - y));
    a = a < .04 ? 0 : a > .96 ? 1 : a;
    alpha[y * W + x] = a;
    const o = (y * W + x) * 4, i = (y * W + x) * 3;
    out[o] = a ? px[i] : 0; out[o + 1] = a ? px[i + 1] : 0; out[o + 2] = a ? px[i + 2] : 0; out[o + 3] = Math.round(a * 255);
  }
}
