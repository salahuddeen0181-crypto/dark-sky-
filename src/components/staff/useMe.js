'use client';
import { useCallback, useEffect, useState } from 'react';
import { staffApi, telegram, tgSignIn } from './session';

// { me: { id, name, kind }, shift, onShift: [{ id, name, started_at }], named } of the staff app.
// Inside Telegram it signs in on every launch and follows "Open order" links (start_param o<id>).
export function useMe() {
  const [s, setS] = useState(null);
  const load = useCallback(() => staffApi('/api/staff/me').then(setS).catch(() => {}), []);

  useEffect(() => {
    (async () => {
      const w = await telegram();
      if (w) {
        try {
          const r = await tgSignIn(w);
          if (r.pending) { location.replace('/staff/login'); return; }
          const to = /^o\d+$/.test(r.startParam || '') ? `/staff/o/${r.startParam.slice(1)}` : null;
          if (to && location.pathname !== to && !sessionStorage.getItem('darksky.opened.' + r.startParam)) {
            sessionStorage.setItem('darksky.opened.' + r.startParam, '1'); // follow the link once, then the board is free
            location.replace(to); return;
          }
        } catch { /* falls back to the cookie / PIN session */ }
      }
      load();
    })();
  }, [load]);

  // shift_('start' | 'end'): the waiter's own shift (shift itself is the open shift or null)
  const shift_ = async action => setS(await staffApi('/api/staff/me', 'POST', { action }));
  return { ...(s || {}), ready: !!s, reload: load, shift_ };
}
