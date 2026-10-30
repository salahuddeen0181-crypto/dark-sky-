'use client';
// A question the guest answers before anything goes to the staff: ordering again after an order went out,
// a send whose answer was lost, an order that turned out to have arrived. a: { title, text, lines?, total?, status?,
// buttons: [{ label, onClick, primary? }] } or null (closed).
import React from 'react';
import { css, GLASS } from './menu-ui';

export default function GuestAsk({ a }) {
  const open = !!a;
  return (
    <div aria-hidden={!open} role="dialog" style={css(`position:fixed;inset:0;z-index:11;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,8,12,.72);opacity:${open ? 1 : 0};pointer-events:${open ? 'auto' : 'none'};transition:opacity .25s ease` + GLASS)}>
      {a && (
        <div style={css('width:100%;max-width:420px;max-height:calc(100dvh - 32px);overflow-y:auto;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:#111117;padding:22px 20px 18px;display:flex;flex-direction:column;gap:16px')}>
          <div style={css('display:flex;flex-direction:column;gap:6px')}>
            <h2 style={css('margin:0;font:400 17px/1.3 Michroma,sans-serif;letter-spacing:.04em;text-transform:uppercase')}>{a.title}</h2>
            {a.status && <span style={css('font:600 12.5px/1.3 Manrope,sans-serif;color:#f2a676')}>{a.status}</span>}
          </div>

          {a.lines && a.lines.length > 0 && (
            <div style={css('display:flex;flex-direction:column;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);padding:4px 14px')}>
              {a.lines.map((l, i) => (
                <div key={i} style={css(`display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:${i ? '1px solid rgba(255,255,255,.06)' : '0'};font:500 14px/1.35 Manrope,sans-serif`)}>
                  <span style={css('min-width:0')}>{l.name}{l.variant ? <span style={css('color:rgba(242,242,244,.5)')}> · {l.variant}</span> : null} <span style={css('color:#f2a676')}>× {l.qty}</span></span>
                  <span style={css('flex:none;font-variant-numeric:tabular-nums;color:rgba(242,242,244,.75)')}>{l.total}</span>
                </div>
              ))}
              {a.total && <div style={css('display:flex;justify-content:flex-end;padding:10px 0;border-top:1px solid rgba(255,255,255,.1);font:700 15px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>{a.total}</div>}
            </div>
          )}

          {a.text && <p style={css('margin:0;font:500 15px/1.45 Manrope,sans-serif;color:rgba(242,242,244,.85)')}>{a.text}</p>}

          <div style={css('display:flex;flex-direction:column;gap:8px')}>
            {a.buttons.map((b, i) => (
              <button key={i} className="ds-press" onClick={b.onClick} style={css('display:flex;align-items:center;justify-content:center;text-align:center;padding:0 16px;' + (b.primary
                ? 'height:54px;border-radius:16px;background:#f2f2f4;color:#050507;font:600 15px/1.2 Manrope,sans-serif'
                : 'height:50px;border-radius:16px;border:1px solid rgba(255,255,255,.16);font:600 14px/1.2 Manrope,sans-serif;color:rgba(242,242,244,.85)'))}>{b.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
