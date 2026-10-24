'use client';
import { useEffect, useState } from 'react';
import { api } from '@/components/admin/api';
import { telegram, tgSignIn } from '@/components/staff/session';

// Inside Telegram (the staff Mini App) the waiter is signed in automatically; elsewhere — the bar tablet's PIN.
const target = (next, startParam) => (/^o\d+$/.test(startParam || '') ? `/staff/o/${startParam.slice(1)}` : next && next.startsWith('/staff') ? next : '/staff');

export default function StaffLogin() {
  const [pin, setPin] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tg, setTg] = useState('checking');
  const next = () => new URLSearchParams(location.search).get('next') || '';

  useEffect(() => {
    telegram().then(async w => {
      if (!w) return setTg('');
      try {
        const r = await tgSignIn(w);
        if (r.pending) setTg(`Привет, ${r.name}! Заявка отправлена администратору. После одобрения откройте приложение снова.`);
        else location.replace(target(next(), r.startParam));
      } catch (e) { setTg(e.message); }
    });
  }, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/staff/login', 'POST', { pin }); location.href = target(next()); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  if (tg) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-6 text-center">
        <div className="font-display text-xl tracking-[.14em]">DARKSKY</div>
        <div className="text-sm leading-relaxed text-white/70">{tg === 'checking' ? 'Входим…' : tg}</div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <div className="mb-4">
        <div className="font-display text-xl tracking-[.14em]">DARKSKY</div>
        <div className="text-sm text-white/50">Заказы · вход для персонала</div>
      </div>
      <input type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN"
        className="h-12 rounded-xl border border-white/15 bg-white/5 px-4 text-center text-lg tracking-[.3em] outline-none focus:border-[#e8793c]" />
      {err && <div className="text-sm text-[#f2a676]">{err}</div>}
      <button disabled={busy || !pin} className="h-12 rounded-xl bg-[#f2f2f4] font-semibold text-[#050507] disabled:opacity-60">{busy ? 'Входим…' : 'Войти'}</button>
      <p className="text-xs leading-relaxed text-white/40">Свой PIN выдаёт администратор (админка → «Персонал»), PIN планшета у бара — общий. Можно входить и через Telegram: напишите боту /start и откройте приложение из бота.</p>
    </form>
  );
}
