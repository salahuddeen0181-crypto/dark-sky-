'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/components/admin/api';
import { STATUS, hhmm, ago } from './OrderCard';
import { ShiftBar, useActor } from './Who';
import AddDish from './AddDish';
import { staffApi } from './session';
import { useMe } from './useMe';
import { tableName } from '@/lib/table-name';

// One order (the Telegram link leads here): approve, serve, edit — change quantities, remove or add dishes.
export default function OrderDetail({ id }) {
  const s = useMe(), { ask, picker } = useActor(s);
  const [o, setO] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  const [qty, setQty] = useState(null), [added, setAdded] = useState([]), [adding, setAdding] = useState(false); // edit mode: qty != null
  const editing = qty !== null;

  // MARK: - Data
  const load = useCallback(() => staffApi(`/api/staff/orders/${id}`).then(r => { setO(r.order); setNow(Date.now()); }).catch(e => setErr(e.message)), [id]);
  useEffect(() => {
    if (!s.ready || editing) return;
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [s.ready, editing, load]);

  async function act(action) {
    const who = await ask();
    if (!who) return;
    setBusy(true); setErr('');
    try { setO((await staffApi(`/api/staff/orders/${id}`, 'POST', { action, ...who })).order); s.reload(); }
    catch (e) { setErr(e.message); if (e.data?.order) setO(e.data.order); }
    setBusy(false);
  }
  async function save() {
    const edits = qty.map((q, i) => ({ i, qty: q })).filter(e => e.qty !== o.lines[e.i].qty);
    const add = added.map(({ id: dish, vi, qty: n }) => ({ id: dish, vi, qty: n }));
    if (!edits.length && !add.length) return cancel();
    setBusy(true); setErr('');
    try { setO((await staffApi(`/api/staff/orders/${id}`, 'POST', { action: 'edit', edits, add })).order); cancel(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const cancel = () => { setQty(null); setAdded([]); setAdding(false); };
  const step = (i, d) => setQty(q => q.map((x, k) => (k === i ? Math.max(0, Math.min(20, x + d)) : x)));
  const stepAdded = (i, d) => setAdded(a => a.map((x, k) => (k === i ? { ...x, qty: x.qty + d } : x)).filter(x => x.qty > 0));
  const addDish = d => setAdded(a => { const k = a.findIndex(x => x.id === d.id && x.vi === d.vi); return k < 0 ? [...a, d] : a.map((x, j) => (j === k ? { ...x, qty: x.qty + 1 } : x)); });

  if (err && !o) return <div className="mx-auto max-w-xl px-4 py-16 text-center text-white/60">{err} · <Link href="/staff" className="underline">к заказам</Link></div>;
  if (!o) return <div className="py-16 text-center text-white/50">Загрузка…</div>;
  const [label, cls] = STATUS[o.status] || [o.status, ''];
  const open = o.status === 'new' || o.status === 'accepted';
  const draft = editing && [...o.lines.map((l, i) => (l.price ?? 0) * qty[i]), ...added.map(a => (a.price ?? 0) * a.qty)].reduce((x, y) => x + y, 0);
  const Qty = ({ n, on }) => (
    <div className="flex items-center rounded-xl border border-white/15">
      <button onClick={() => on(-1)} className="h-10 w-10 text-lg" aria-label="Меньше">−</button>
      <span className="w-6 text-center font-semibold tabular-nums">{n}</span>
      <button onClick={() => on(1)} className="h-10 w-10 text-lg" aria-label="Больше">+</button>
    </div>
  );

  // MARK: - View
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-3">
        <Link href="/staff" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70">← Заказы</Link>
        <span className={`ml-auto rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>
      </div>
      <ShiftBar s={s} />
      <div>
        <div className="font-display text-4xl">{tableName(o)}</div>
        <div className="text-sm text-white/50">#{o.id} · {hhmm(o.created_at)} · {ago(o.created_at, now)}{o.accepted_by ? ` · одобрил(а) ${o.accepted_by}` : ''}</div>
      </div>

      <div className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-[#0e0e13] px-4">
        {o.lines.map((l, i) => (
          <div key={i} className={`flex items-center gap-3 py-3 ${editing && qty[i] === 0 ? 'text-white/30 line-through' : ''}`}>
            <div className="min-w-0 flex-1"><div className="font-semibold">{l.name}</div>{l.variant && <div className="text-xs text-white/55">{l.variant}</div>}</div>
            {editing ? <Qty n={qty[i]} on={d => step(i, d)} /> : <><span className="font-display text-xl tabular-nums">×{l.qty}</span><span className="w-20 text-right text-sm tabular-nums text-white/70">{fmt(l.total)}</span></>}
          </div>
        ))}
        {added.map((a, i) => (
          <div key={'a' + i} className="flex items-center gap-3 py-3 text-[#9fd8a8]">
            <div className="min-w-0 flex-1"><div className="font-semibold">+ {a.name}</div>{a.variant && <div className="text-xs opacity-75">{a.variant}</div>}</div>
            <Qty n={a.qty} on={d => stepAdded(i, d)} />
          </div>
        ))}
      </div>

      {editing && (adding ? <AddDish onAdd={addDish} onClose={() => setAdding(false)} />
        : <button onClick={() => setAdding(true)} className="h-12 rounded-xl border border-dashed border-white/25 text-white/80">+ Добавить блюдо</button>)}
      {o.note && <div className="rounded-xl border border-[#e8793c]/40 bg-[#e8793c]/10 px-3 py-2 text-sm text-[#f6c3a3]">💬 {o.note}</div>}
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-white/60">{o.cash ? 'Наличные / крипто −15%' : 'Оплата обычная'}{o.edited_at ? ' · изменён' : ''}</span>
        <span className="text-xl font-bold tabular-nums">{editing ? `≈ ${fmt(o.cash ? draft - Math.round(draft * 0.15) : draft)}` : fmt(o.total)}{o.on_request ? ' +' : ''}</span>
      </div>
      {err && <div role="alert" className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{err}</div>}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center border-t border-white/10 bg-[#0a0a0d]/95 p-3 backdrop-blur">
          <div className="flex w-full max-w-xl gap-2">
            {editing ? (
              <>
                <button disabled={busy} onClick={save} className="h-12 flex-1 rounded-xl bg-[#f2f2f4] font-semibold text-[#050507] disabled:opacity-60">Сохранить изменения</button>
                <button onClick={cancel} className="h-12 rounded-xl border border-white/15 px-4 text-white/75">Отмена</button>
              </>
            ) : (
              <>
                {o.status === 'new' && <button disabled={busy} onClick={() => act('accept')} className="h-12 flex-1 rounded-xl bg-[#e8793c] font-semibold text-black disabled:opacity-60">✋ Одобрено</button>}
                {o.status === 'accepted' && <button disabled={busy} onClick={() => act('serve')} className="h-12 flex-1 rounded-xl bg-[#f2f2f4] font-semibold text-[#050507] disabled:opacity-60">🍽 Подано</button>}
                <button onClick={() => setQty(o.lines.map(l => l.qty))} className="h-12 rounded-xl border border-white/15 px-4 text-white/75">Править</button>
              </>
            )}
          </div>
        </div>
      )}
      {picker}
    </div>
  );
}
