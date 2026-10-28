'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fmt } from './api';
import AddDish from '@/components/staff/AddDish';
import { tableName } from '@/lib/table-name';

const STATUSES = [['new', 'Новый'], ['accepted', 'Принят'], ['served', 'Подано']];
const tz = 'America/Argentina/Buenos_Aires';
const when = d => new Date(d).toLocaleString('ru-RU', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const num = v => (v === '' || v == null ? null : Math.max(0, Math.round(Number(v)) || 0));

// The admin corrects an order by hand, whatever its status: quantities, prices, dishes added or removed, payment,
// status, the guest's comment — or takes it out of the statistics. Saved at once, the statistics follow.
export default function OrderEditor({ order: o }) {
  const router = useRouter();
  const [rows, setRows] = useState(o.lines.map(l => ({ qty: l.qty, price: l.price })));
  const [added, setAdded] = useState([]), [adding, setAdding] = useState(false);
  const [cash, setCash] = useState(!!o.cash), [status, setStatus] = useState(o.status), [note, setNote] = useState(o.note || '');
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');

  const put = (i, v) => setRows(r => r.map((x, k) => (k === i ? { ...x, ...v } : x)));
  const stepAdded = (i, d) => setAdded(a => a.map((x, k) => (k === i ? { ...x, qty: x.qty + d } : x)).filter(x => x.qty > 0));
  const addDish = d => setAdded(a => { const k = a.findIndex(x => x.id === d.id && x.vi === d.vi); return k < 0 ? [...a, d] : a.map((x, j) => (j === k ? { ...x, qty: x.qty + 1 } : x)); });
  const subtotal = [...rows.map(r => (r.price ?? 0) * r.qty), ...added.map(a => (a.price ?? 0) * a.qty)].reduce((x, y) => x + y, 0);
  const total = cash ? subtotal - Math.round(subtotal * 0.15) : subtotal;

  async function save() {
    const lines = rows.map((r, i) => ({ i, qty: r.qty, price: r.price })).filter((r, i) => r.qty !== o.lines[i].qty || r.price !== o.lines[i].price);
    setBusy(true); setErr('');
    try {
      await api(`/api/admin/orders/${o.id}`, 'PUT', { lines, add: added.map(({ id, vi, qty }) => ({ id, vi, qty })), cash, status, note });
      router.push('/admin/orders'); router.refresh();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function archive() {
    if (!confirm('Убрать заказ из статистики? Он попадёт в «Статистика → Архив», оттуда его можно вернуть.')) return;
    setBusy(true);
    try { await api(`/api/admin/orders/${o.id}`, 'POST', { action: 'archive' }); router.push('/admin/orders'); router.refresh(); } catch (e) { setErr(e.message); setBusy(false); }
  }

  const input = 'h-10 rounded-lg border border-white/15 bg-white/5 px-2 text-right tabular-nums outline-none focus:border-[#e8793c]';
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href="/admin/orders" className="text-sm text-white/55 hover:text-white">← Заказы</Link>
        <h1 className="font-display text-lg uppercase tracking-[.08em]">{tableName(o)} · #{o.id}</h1>
        <span className="text-xs text-white/45">{when(o.created_at)}{o.accepted_by ? ` · ${o.accepted_by}` : ''}{o.archived_at ? ' · в архиве' : ''}</span>
      </div>

      <section className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-[#0e0e13] px-4">
        <div className="grid grid-cols-[1fr_96px_120px_96px] gap-3 py-2 text-xs text-white/40 max-sm:hidden"><span>Позиция</span><span className="text-center">Кол-во</span><span className="text-right">Цена</span><span className="text-right">Сумма</span></div>
        {o.lines.map((l, i) => (
          <div key={i} className={`grid grid-cols-[1fr_96px_120px_96px] items-center gap-3 py-3 max-sm:grid-cols-2 ${rows[i].qty === 0 ? 'opacity-40' : ''}`}>
            <div className="min-w-0 max-sm:col-span-2"><div className={`truncate font-semibold ${rows[i].qty === 0 ? 'line-through' : ''}`}>{l.name}</div>{l.variant && <div className="truncate text-xs text-white/45">{l.variant}</div>}</div>
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => put(i, { qty: Math.max(0, rows[i].qty - 1) })} className="h-9 w-9 rounded-lg border border-white/15" aria-label="Меньше">−</button>
              <span className="w-6 text-center tabular-nums">{rows[i].qty}</span>
              <button onClick={() => put(i, { qty: Math.min(99, rows[i].qty + 1) })} className="h-9 w-9 rounded-lg border border-white/15" aria-label="Больше">+</button>
            </div>
            <input inputMode="numeric" value={rows[i].price ?? ''} placeholder="по запросу" onChange={e => put(i, { price: num(e.target.value.replace(/\D/g, '')) })} className={input} aria-label="Цена" />
            <span className="text-right tabular-nums text-white/75 max-sm:col-span-2">{rows[i].price == null ? '—' : fmt(rows[i].price * rows[i].qty)}</span>
          </div>
        ))}
        {added.map((a, i) => (
          <div key={'a' + i} className="grid grid-cols-[1fr_96px_120px_96px] items-center gap-3 py-3 max-sm:grid-cols-2">
            <div className="min-w-0 max-sm:col-span-2"><div className="truncate font-semibold text-[#f2a676]">+ {a.name}</div>{a.variant && <div className="truncate text-xs text-white/45">{a.variant}</div>}</div>
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => stepAdded(i, -1)} className="h-9 w-9 rounded-lg border border-white/15">−</button>
              <span className="w-6 text-center tabular-nums">{a.qty}</span>
              <button onClick={() => stepAdded(i, 1)} className="h-9 w-9 rounded-lg border border-white/15">+</button>
            </div>
            <span className="text-right text-sm text-white/50">{fmt(a.price)}</span>
            <span className="text-right tabular-nums text-white/75">{a.price == null ? '—' : fmt(a.price * a.qty)}</span>
          </div>
        ))}
        <div className="py-3">
          {adding ? <AddDish onAdd={addDish} onClose={() => setAdding(false)} />
            : <button onClick={() => setAdding(true)} className="h-10 rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75 hover:bg-white/5">+ Добавить блюдо</button>}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-[#0e0e13] p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-white/55">Статус</span>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-1">
            {STATUSES.map(([k, n]) => <button key={k} onClick={() => setStatus(k)} className={`h-9 rounded-md ${status === k ? 'bg-[#f2f2f4] text-[#050507]' : 'text-white/70'}`}>{n}</button>)}
          </div>
        </label>
        <label className="flex items-center gap-3 self-end text-sm">
          <input type="checkbox" checked={cash} onChange={e => setCash(e.target.checked)} className="h-5 w-5" /> Наличные / крипто −15%
        </label>
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="text-white/55">Комментарий гостя</span>
          <input value={note} maxLength={200} onChange={e => setNote(e.target.value)} className="h-10 rounded-lg border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]" />
        </label>
      </section>

      {err && <div className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{err}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto text-sm text-white/55">Итог: <b className="text-xl text-white tabular-nums">{fmt(total)}</b>{cash && subtotal ? <span> (скидка {fmt(subtotal - total)})</span> : null}</div>
        {!o.archived_at && <button onClick={archive} disabled={busy} className="h-11 rounded-xl border border-white/15 px-4 text-sm text-white/60 hover:text-[#f2a676]">Убрать из статистики</button>}
        <Link href="/admin/orders" className="flex h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-white/75">Отмена</Link>
        <button onClick={save} disabled={busy} className="h-11 rounded-xl bg-[#f2f2f4] px-5 font-semibold text-[#050507] disabled:opacity-50">Сохранить</button>
      </div>
    </div>
  );
}
