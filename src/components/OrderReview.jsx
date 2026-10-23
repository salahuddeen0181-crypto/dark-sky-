'use client';
// Full-screen order: the guest checks everything before it goes to the staff, then follows its status here.
import React from 'react';
import { css, Arrow, Close, CLOSE_BTN, GLASS } from './menu-ui';

const LABEL = 'font:400 10px/1 Michroma,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,242,244,.6)';
const STEPS = ['new', 'accepted', 'served'];

function Steps({ r }) {
  const at = Math.max(0, STEPS.indexOf(r.status));
  return (
    <div style={css('display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px')}>
      {[r.tO('stSent'), r.tO('stAcc'), r.tO('stServed')].map((label, i) => {
        const done = i <= at, now = i === at && r.status !== 'served';
        return (
          <div key={i} style={css('display:flex;flex-direction:column;gap:8px')}>
            <div style={css(`height:4px;border-radius:2px;background:${done ? '#e8793c' : 'rgba(255,255,255,.14)'};${now ? 'animation:ds-pulse 1.6s ease-in-out infinite' : ''}`)} />
            <span style={css(`font:600 12.5px/1.3 Manrope,sans-serif;color:${done ? '#f2f2f4' : 'rgba(242,242,244,.45)'}`)}>{label}{i === 1 && r.by ? ` · ${r.by}` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderReview({ r }) {
  const { t, tO } = r;
  return (
    <div aria-hidden={!r.open} style={css(`position:fixed;inset:0;z-index:10;background:rgba(8,8,12,.8);opacity:${r.open ? 1 : 0};pointer-events:${r.open ? 'auto' : 'none'};transition:opacity .35s ease` + GLASS)}>
      <div style={css(`height:100dvh;overflow-y:auto;overscroll-behavior:contain;transform:translateY(${r.open ? '0' : '24px'});transition:transform .45s cubic-bezier(.2,.8,.2,1)`)}>
        <div style={css('max-width:540px;margin:0 auto;padding:calc(18px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:20px')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:12px')}>
            <div style={css('display:flex;flex-direction:column;gap:8px')}>
              <span style={css(LABEL)}>{t('table')} {r.table}</span>
              <h2 style={css('margin:0;font:400 20px/1.2 Michroma,sans-serif;letter-spacing:.06em;text-transform:uppercase')}>{r.sent ? t('order') : tO('review')}</h2>
            </div>
            <button onClick={r.onClose} aria-label="Close" style={css(CLOSE_BTN)}><Close /></button>
          </div>

          {r.sent && <Steps r={r} />}
          {r.sent && r.edited && <div role="status" style={css('padding:12px 14px;border-radius:14px;border:1px solid rgba(232,121,60,.5);background:rgba(232,121,60,.1);font:500 14px/1.4 Manrope,sans-serif;color:#f6c3a3')}>{tO('changed')}</div>}

          <div style={css('display:flex;flex-direction:column;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:4px 16px')}>
            {r.lines.map((ln, i) => (
              <div key={ln.key} style={css(`display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:14px 0;${i ? 'border-top:1px solid rgba(255,255,255,.07)' : ''}`)}>
                <div style={css('display:flex;flex-direction:column;gap:4px;min-width:0')}>
                  <span style={css('font:600 15px/1.3 Manrope,sans-serif')}>{ln.name} <span style={css('color:#f2a676')}>× {ln.qty}</span></span>
                  {ln.variant && <span style={css('font:400 12.5px/1.3 Manrope,sans-serif;color:rgba(242,242,244,.6)')}>{ln.variant}</span>}
                </div>
                <span style={css('font:600 14px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums;color:rgba(242,242,244,.85)')}>{ln.total}</span>
              </div>
            ))}
          </div>

          {!r.sent && (
            <>
              <button onClick={r.onCash} style={css('display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04)')}>
                <span style={css('font:500 14px/1.35 Manrope,sans-serif')}>{t('cash')}</span>
                <span style={css(`flex:none;width:46px;height:28px;border-radius:14px;background:${r.cash ? '#e8793c' : 'rgba(255,255,255,.18)'};position:relative;transition:background .2s`)}>
                  <span style={css(`position:absolute;top:3px;left:${r.cash ? '21px' : '3px'};width:22px;height:22px;border-radius:50%;background:#f2f2f4;transition:left .2s`)} />
                </span>
              </button>
              <label style={css('display:flex;flex-direction:column;gap:10px')}>
                <span style={css(LABEL)}>{tO('note')}</span>
                <textarea value={r.note} onChange={e => r.onNote(e.target.value)} maxLength={200} rows={2} placeholder={tO('notePh')}
                  style={css('resize:none;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#f2f2f4;font:500 16px/1.4 Manrope,sans-serif;outline:none')} />
              </label>
            </>
          )}
          {r.sent && r.note && <div style={css('font:500 14px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.75)')}>💬 {r.note}</div>}

          <div style={css('display:flex;flex-direction:column;gap:8px;font:500 14px/1 Manrope,sans-serif;font-variant-numeric:tabular-nums')}>
            <div style={css('display:flex;justify-content:space-between;color:rgba(242,242,244,.7)')}><span>{t('subtotal')}</span><span>{r.subtotal}</span></div>
            {r.hasDiscount && <div style={css('display:flex;justify-content:space-between;color:#f2a676')}><span>{t('discount')} −15%</span><span>{r.discount}</span></div>}
            <div style={css('display:flex;justify-content:space-between;align-items:baseline;padding-top:6px;font:700 22px/1 Manrope,sans-serif')}><span style={css('font:400 13px/1 Michroma,sans-serif;letter-spacing:.12em;text-transform:uppercase')}>{t('total')}</span><span>{r.total}</span></div>
            {r.onReq && <span style={css('font:400 12px/1.4 Manrope,sans-serif;color:rgba(242,242,244,.55)')}>+ {t('onRequest')}</span>}
          </div>

          {r.err && <div role="alert" style={css('padding:12px 14px;border-radius:14px;border:1px solid rgba(232,121,60,.5);background:rgba(232,121,60,.1);font:500 14px/1.4 Manrope,sans-serif;color:#f6c3a3')}>{r.err}</div>}

          {r.sent ? (
            <button onClick={r.onNew} style={css('height:56px;border-radius:16px;border:1px solid rgba(255,255,255,.18);font:600 14px/1 Manrope,sans-serif')}>{t('newOrder')}</button>
          ) : (
            <div style={css('display:flex;gap:10px')}>
              <button onClick={r.onBack} style={css('flex:none;height:60px;padding:0 16px;border-radius:18px;border:1px solid rgba(255,255,255,.18);font:600 14px/1 Manrope,sans-serif')}>{tO('edit')}</button>
              <button className="ds-press" disabled={r.sending} onClick={r.onSend} style={css(`flex:1;height:60px;border-radius:18px;background:#f2f2f4;color:#050507;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 14px;min-width:0;font:400 11px/1 Michroma,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:${r.sending ? .6 : 1}`)}>
                <span style={css('white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{r.sending ? tO('sending') : t('send')}</span>
                {!r.sending && <Arrow w={1.5} flip={r.flip} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
