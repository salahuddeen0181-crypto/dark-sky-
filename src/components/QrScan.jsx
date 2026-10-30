'use client';
// Full-screen QR scanner for a guest who opened the menu without the table's QR: the back camera, a frame to aim
// with, and a table link (…/t/<token>, any host the QR was printed for) opens this site's menu for that table.
// Decoding: the browser's own BarcodeDetector where there is one (Chrome on Android), else jsQR, loaded only here.
import React, { useEffect, useRef, useState } from 'react';
import { css, Close, CLOSE_BTN } from './menu-ui';

const tableToken = text => { const m = /\/t\/([\w-]+)\/?(?:[?#].*)?$/.exec(String(text || '').trim()); return m ? m[1] : null; };

export default function QrScan({ onClose, tO }) {
  const video = useRef(null), say = useRef(tO);
  say.current = tO; // the language may change; the camera must not restart for it
  const [msg, setMsg] = useState(''), [denied, setDenied] = useState(false);

  useEffect(() => {
    let stream = null, timer = 0, stop = false, wrongAt = 0;
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
    const found = text => {
      const token = tableToken(text);
      if (token) { stop = true; location.href = '/t/' + token; return; }
      if (Date.now() - wrongAt > 2500) { wrongAt = Date.now(); setMsg(say.current('scanWrong')); }
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stop) return stream.getTracks().forEach(t => t.stop());
        const v = video.current; v.srcObject = stream; await v.play();
        const native = 'BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats?.())?.includes('qr_code')
          ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
        const jsQR = native ? null : (await import('jsqr')).default;
        const scan = async () => {
          if (stop) return;
          if (v.readyState >= 2 && v.videoWidth) {
            if (native) {
              const codes = await native.detect(v).catch(() => []);
              if (codes[0]) found(codes[0].rawValue);
            } else {
              // a smaller copy of the frame is plenty for a QR on the table and keeps the phone cool
              const k = Math.min(1, 640 / v.videoWidth), w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
              canvas.width = w; canvas.height = h; ctx.drawImage(v, 0, 0, w, h);
              const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
              if (code) found(code.data);
            }
          }
          timer = setTimeout(scan, 120);
        };
        scan();
      } catch (e) { setDenied(true); }
    })();
    return () => { stop = true; clearTimeout(timer); stream && stream.getTracks().forEach(t => t.stop()); };
  }, []);

  return (
    <div role="dialog" style={css('position:fixed;inset:0;z-index:12;background:#000;display:flex;align-items:center;justify-content:center')}>
      <video ref={video} playsInline muted style={css('position:absolute;inset:0;width:100%;height:100%;object-fit:cover')} />
      {!denied && <div style={css('position:relative;width:min(68vw,280px);aspect-ratio:1;border-radius:24px;box-shadow:0 0 0 100vmax rgba(0,0,0,.55);border:2px solid rgba(242,242,244,.85)')} />}
      <div style={css('position:absolute;left:0;right:0;top:0;display:flex;justify-content:flex-end;padding:calc(14px + env(safe-area-inset-top)) 16px 0')}>
        <button onClick={onClose} aria-label="Close" style={css(CLOSE_BTN)}><Close /></button>
      </div>
      <div style={css('position:absolute;left:0;right:0;bottom:0;padding:0 24px calc(32px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center')}>
        <span style={css('font:500 15px/1.45 Manrope,sans-serif;color:#f2f2f4;max-width:340px')}>{denied ? tO('scanDenied') : tO('scanHint')}</span>
        {msg && !denied && <span style={css('font:600 13px/1.3 Manrope,sans-serif;color:#f2a676')}>{msg}</span>}
      </div>
    </div>
  );
}
