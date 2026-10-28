'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, fmt } from '../api';
import { Card } from './Charts';

// Postgres text ('2026-10-28 02:13:45.123456+00'), an ISO string or a number → a date
const toDate = t => new Date(typeof t === 'string' ? t.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00') : t);
const when = t => toDate(t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

// Archive: after test orders, everything so far is set aside and the statistics start from zero. Nothing is deleted:
// each archive can be brought back.
export default function ArchivePanel() {
  const router = useRouter();
  const [s, setS] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const load = () => api('/api/admin/archive', 'GET').then(setS).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function run(fn) {
    setBusy(true); setErr('');
    try { await fn(); await load(); router.refresh(); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const archive = () => {
    const p = s?.pending;
    if (!p?.orders) return;
    const msg = `В архив уйдут ${p.orders} заказ(ов)${p.open ? `, из них ${p.open} ещё не закрыты (пропадут и с доски официантов)` : ''}, а также смены и отчёты.\nСтатистика начнётся с нуля. Архив можно вернуть.`;
    if (confirm(msg)) run(() => api('/api/admin/archive', 'POST'));
  };
  const restore = a => confirm(`Вернуть архив от ${when(a.at)} (${a.orders} заказов) в статистику?`) && run(() => api('/api/admin/archive', 'DELETE', { at: a.at }));

  return (
    <Card title="Архив статистики" sub="Например, после тестовых заказов: всё до этого момента уходит в архив, статистика и список заказов начинаются с нуля. Ничего не удаляется.">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={archive} disabled={busy || !s?.pending?.orders}
          className="h-10 rounded-xl border border-[#e8793c]/60 bg-[#e8793c]/10 px-4 text-sm text-[#f2a676] hover:bg-[#e8793c]/20 disabled:opacity-40">
          Архивировать и обнулить
        </button>
        <span className="text-xs text-white/45">{s ? (s.pending.orders ? `Сейчас в статистике заказов: ${s.pending.orders}` : 'Статистика пуста') : '…'}</span>
      </div>
      {err && <div className="text-sm text-[#f6c3a3]">{err}</div>}
      {!!s?.archives?.length && (
        <ul className="flex flex-col divide-y divide-white/5 text-sm">
          {s.archives.map(a => (
            <li key={String(a.at)} className="flex flex-wrap items-center gap-3 py-2">
              <span className="text-white/80">Архив от {when(a.at)}</span>
              <span className="text-white/45">{a.orders} зак. · {fmt(a.revenue)} · заказы {when(a.from)} – {when(a.to)}</span>
              <button onClick={() => restore(a)} disabled={busy} className="ml-auto rounded-lg border border-white/15 px-3 py-1 text-xs text-white/75 hover:text-white">Вернуть</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
