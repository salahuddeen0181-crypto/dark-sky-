'use client';
import Link from 'next/link';
import { fmt } from '@/components/admin/api';
import { tableName } from '@/lib/table-name';

export const STATUS = { new: ['Новый', 'bg-[#e8793c] text-black'], accepted: ['Одобрено', 'bg-white/15'], served: ['Подано', 'bg-white/5 text-white/60'], failed: ['Не доставлен', 'border border-[#e8793c]/60 text-[#f2a676]'] };
export const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
export const ago = (d, now) => { const m = Math.max(0, Math.floor((now - new Date(d)) / 60e3)); return m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : `${Math.floor(m / 60)} ч ${m % 60} мин назад`; };

// One order on the staff board; the whole order and editing are on /staff/o/<id>
export default function OrderCard({ o, now, busy, onAction }) {
  const [label, cls] = STATUS[o.status] || [o.status, ''];
  const late = o.status === 'new' && now - new Date(o.created_at) > 5 * 60e3;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border bg-[#0e0e13] p-4 ${o.status === 'new' ? 'border-[#e8793c]/70 shadow-[0_0_30px_rgba(232,121,60,.15)]' : 'border-white/10'}`}>
      <Link href={`/staff/o/${o.id}`} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-2xl">{tableName(o)}</div>
            <div className={`text-xs ${late ? 'text-[#f2a676]' : 'text-white/45'}`}>#{o.id} · {hhmm(o.created_at)} · {ago(o.created_at, now)}</div>
            {o.extra_of && <div className="mt-1 text-xs font-semibold text-[#f2a676]">➕ Дозаказ к #{o.extra_of}</div>}
          </div>
          <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>
        </div>
        <div className="flex flex-col divide-y divide-white/5 text-[15px]">
          {o.lines.map((l, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1"><div className="font-semibold leading-snug">{l.name}</div>{l.variant && <div className="text-xs text-white/55">{l.variant}</div>}</div>
              <span className="font-display text-lg tabular-nums">×{l.qty}</span>
            </div>
          ))}
        </div>
        {o.note && <div className="rounded-xl border border-[#e8793c]/40 bg-[#e8793c]/10 px-3 py-2 text-sm text-[#f6c3a3]">💬 {o.note}</div>}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-white/60">{o.cash ? 'Наличные / крипто −15%' : 'Оплата обычная'}{o.edited_at ? ' · изменён' : ''}</span>
          <span className="text-lg font-bold tabular-nums">{fmt(o.total)}{o.on_request ? ' +' : ''}</span>
        </div>
        {o.accepted_by && <div className="text-xs text-white/50">Одобрил(а): {o.accepted_by}</div>}
      </Link>
      {(o.status === 'new' || o.status === 'accepted') && (
        <div className="flex gap-2">
          {o.status === 'new' && <button disabled={busy} onClick={() => onAction(o.id, 'accept')} className="h-12 flex-1 rounded-xl bg-[#e8793c] font-semibold text-black disabled:opacity-60">Одобрено</button>}
          {o.status === 'accepted' && <button disabled={busy} onClick={() => onAction(o.id, 'serve')} className="h-12 flex-1 rounded-xl bg-[#f2f2f4] font-semibold text-[#050507] disabled:opacity-60">Подано</button>}
          <Link href={`/staff/o/${o.id}`} className="flex h-12 items-center rounded-xl border border-white/15 px-4 text-white/75">Править</Link>
        </div>
      )}
    </div>
  );
}
