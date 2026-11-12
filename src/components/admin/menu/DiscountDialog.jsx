'use client';
import { useState } from 'react';
import { ru, fmt } from '../api';
import { fullPrice, priced } from '@/lib/discount';

// Discounts on one dish from the menu list: a percent for each variant (Philadelphia: prawns −20%) or for the dish.
export default function DiscountDialog({ item, onSave, onClose }) {
  const rows = item.v?.length ? item.v.map(v => ({ name: ru(v.n), full: fullPrice(v), off: v.off || '' })) : [{ name: 'Цена', full: fullPrice(item), off: item.off || '' }];
  const [offs, setOffs] = useState(rows.map(r => r.off)), [busy, setBusy] = useState(false);
  const put = (i, v) => setOffs(o => o.map((x, k) => (k === i ? v : x)));

  async function save(list) {
    setBusy(true);
    const ok = await onSave(list.map(x => Math.round(Number(x) || 0)));
    setBusy(false);
    if (ok !== false) onClose();
  }
  return (
    <div role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && !busy && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0e0e13] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 sm:rounded-3xl">
        <h2 className="font-display text-base uppercase tracking-[.08em]">Скидка · {item.name}</h2>
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const now = priced(r.full, offs[i]);
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-white/50">
                    {now.was ? <><s>{fmt(now.was)}</s> → <span className="text-[#f2a676]">{fmt(now.p)}</span></> : fmt(r.full)}
                  </div>
                </div>
                <input type="number" inputMode="numeric" min="0" max="90" value={offs[i]} onChange={e => put(i, e.target.value)} placeholder="0" aria-label={`Скидка на «${r.name}», %`}
                  className="h-11 w-20 rounded-xl border border-white/15 bg-white/5 px-3 text-right text-white outline-none focus:border-[#e8793c]" />
                <span className="text-sm text-white/60">%</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-white/45">Гость увидит старую цену зачёркнутой и метку «−N%». В заказ уходит цена со скидкой. От 1 до 90%; 0 или пусто — без скидки.</p>
        <div className="flex gap-2">
          <button onClick={() => save(rows.map(() => 0))} disabled={busy} className="h-12 flex-1 rounded-xl border border-white/15 text-sm text-white/75">Убрать скидки</button>
          <button onClick={() => save(offs)} disabled={busy} className="h-12 flex-1 rounded-xl bg-[#f2f2f4] text-sm font-semibold text-[#050507] disabled:opacity-50">{busy ? 'Сохраняем…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}
