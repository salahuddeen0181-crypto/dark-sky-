'use client';
// The section's categories pinned in the header once the buttons in the section card are scrolled away:
// big pills that scroll sideways, with ‹ › arrows showing there is more to either side.
import { useEffect, useRef, useState } from 'react';
import { css, Arrow } from './menu-ui';

const ARROW = 'position:absolute;top:8px;bottom:12px;z-index:1;width:56px;display:flex;align-items:center;color:#f2f2f4;transition:opacity .2s';

export default function CatStrip({ cats, shown, flip }) {
  const row = useRef(null);
  const [edge, setEdge] = useState({ start: false, end: false });
  const active = cats.findIndex(c => c.on);

  // which sides still have pills out of sight (scrollLeft runs negative in rtl)
  const measure = () => {
    const el = row.current;
    if (!el) return;
    const x = Math.abs(el.scrollLeft), max = el.scrollWidth - el.clientWidth;
    setEdge({ start: x > 4, end: x < max - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cats.length]);
  // the picked category slides into view
  useEffect(() => {
    // only the row scrolls (scrollIntoView would move the page too)
    const r = row.current, el = r?.children[active];
    if (!el) return;
    const a = el.getBoundingClientRect(), b = r.getBoundingClientRect();
    r.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: shown ? 'smooth' : 'auto' });
  }, [active, shown]);

  const rtl = flip !== 'none';
  const step = dir => {
    const el = row.current;
    el?.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.7, behavior: 'smooth' });
  };
  const DOT = 'width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(242,242,244,.16);border:1px solid rgba(255,255,255,.2)';
  const fade = side => `linear-gradient(to ${side}, rgba(22,23,29,0), rgba(22,23,29,.97) 55%)`;

  return (
    // laid over the page right under the header, so showing it never shifts the content (solid: a blur nested
    // in the header's own blur sees nothing behind it)
    <div aria-hidden={!shown} style={css(`position:absolute;top:100%;inset-inline:0;background:rgba(22,23,29,.94);border-bottom:1px solid rgba(255,255,255,.06);box-shadow:0 10px 24px rgba(0,0,0,.35);transform:translateY(${shown ? 0 : -8}px);opacity:${shown ? 1 : 0};pointer-events:${shown ? 'auto' : 'none'};transition:transform .22s,opacity .2s`)}>
      <div style={css('position:relative;overflow:hidden;padding-top:8px')}>
        <div ref={row} onScroll={measure} style={css('display:flex;gap:8px;overflow-x:auto;padding:2px 16px 12px;scrollbar-width:none')}>
          {cats.map(c => (
            <button key={c.id} onClick={c.onPick} tabIndex={shown ? 0 : -1} style={css(`flex:none;height:44px;padding:0 18px;border-radius:22px;display:flex;align-items:center;gap:8px;border:1px solid ${c.on ? '#f2f2f4' : 'rgba(255,255,255,.14)'};background:${c.on ? '#f2f2f4' : 'rgba(255,255,255,.08)'};color:${c.on ? '#050507' : '#f2f2f4'};font:600 15px/1 Manrope,sans-serif;white-space:nowrap;transition:background .2s,color .2s`)}>
              {c.name}<span style={css('font:500 12px/1 Manrope,sans-serif;opacity:.55')}>{c.count}</span>
            </button>
          ))}
        </div>
        <button aria-label="Previous" tabIndex={-1} onClick={() => step(-1)} style={css(`${ARROW};inset-inline-start:0;justify-content:flex-start;padding-inline-start:6px;background:${fade(rtl ? 'right' : 'left')};opacity:${edge.start ? 1 : 0};pointer-events:${edge.start ? 'auto' : 'none'}`)}>
          <span style={css(DOT)}><Arrow size={15} flip={rtl ? 'none' : 'scaleX(-1)'} /></span>
        </button>
        <button aria-label="Next" tabIndex={-1} onClick={() => step(1)} style={css(`${ARROW};inset-inline-end:0;justify-content:flex-end;padding-inline-end:6px;background:${fade(rtl ? 'left' : 'right')};opacity:${edge.end ? 1 : 0};pointer-events:${edge.end ? 'auto' : 'none'}`)}>
          <span style={css(DOT)}><Arrow size={15} flip={flip} /></span>
        </button>
      </div>
    </div>
  );
}
