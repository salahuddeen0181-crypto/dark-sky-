'use client';
import { useEffect, useMemo, useState } from 'react';
import { fmt } from '@/components/admin/api';
import { staffApi } from './session';

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// "Add a dish" while editing an order: search the menu, pick a variant → onAdd({ id, vi, qty: 1, name, variant, price })
export default function AddDish({ onAdd, onClose }) {
  const [items, setItems] = useState(null), [q, setQ] = useState(''), [open, setOpen] = useState(null);
  useEffect(() => { staffApi('/api/staff/menu').then(r => setItems(r.items)).catch(() => setItems([])); }, []);
  const found = useMemo(() => {
    const k = norm(q.trim());
    return (items || []).filter(i => !k || norm(`${i.name} ${i.ru} ${i.cat}`).includes(k)).slice(0, 60);
  }, [items, q]);
  const add = (i, vi) => onAdd({ id: i.id, vi, qty: 1, name: i.name, variant: vi == null ? '' : i.v[vi].n, price: vi == null ? i.p : i.v[vi].p });

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#111116] p-3">
      <div className="flex gap-2">
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Найти блюдо или категорию" className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]" />
        <button onClick={onClose} className="h-11 rounded-xl border border-white/15 px-3 text-sm text-white/70">Готово</button>
      </div>
      {!items && <div className="py-4 text-center text-sm text-white/45">Загрузка меню…</div>}
      <div className="flex max-h-80 flex-col divide-y divide-white/5 overflow-y-auto">
        {found.map(i => (
          <div key={i.id} className="py-2">
            <button onClick={() => (i.v ? setOpen(open === i.id ? null : i.id) : add(i, null))} className="flex w-full items-center gap-3 text-left">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{i.name}{i.hidden && <span className="ml-2 text-xs text-[#f2a676]">стоп-лист</span>}</div>
                <div className="truncate text-xs text-white/45">{i.cat}{i.ru !== i.name ? ` · ${i.ru}` : ''}</div>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-white/70">{i.v ? `${i.v.length} вар. ▾` : fmt(i.p)}</span>
              {!i.v && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8793c] font-bold text-black">+</span>}
            </button>
            {open === i.id && (
              <div className="mt-2 flex flex-wrap gap-2">
                {i.v.map((v, vi) => <button key={vi} onClick={() => add(i, vi)} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">{v.n} · {fmt(v.p)} +</button>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
