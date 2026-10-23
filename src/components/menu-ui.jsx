// Shared bits of the guest menu UI: the inline-style helper, glass, icons.

// 'a:b;c-d:e' → { a: 'b', cD: 'e' }, memoised: lets the design's style strings stay as written.
const cssCache = new Map();
export function css(str) {
  let o = cssCache.get(str);
  if (o) return o;
  o = {};
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    if (!k) continue;
    const key = k.startsWith('--') ? k : k.replace(/^-webkit-/, 'Webkit-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[key] = decl.slice(i + 1).trim();
  }
  if (cssCache.size > 2000) cssCache.clear();
  cssCache.set(str, o);
  return o;
}

// Frosted glass for the menu surfaces: translucent so the smoke shows through, blurred so the text stays readable
export const GLASS = ';backdrop-filter:blur(10px) saturate(1.25);-webkit-backdrop-filter:blur(10px) saturate(1.25);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)';

export const Arrow = ({ size = 18, w = 1.6, flip }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ transform: flip }}><path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Close = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
// Light round close button: guests have to find it at a glance
export const CLOSE_BTN = 'flex:none;width:44px;height:44px;border-radius:50%;background:#f2f2f4;color:#050507;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.45)';
