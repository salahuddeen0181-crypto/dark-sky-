'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ru, fmt } from './api';

function priceLabel(it) {
  if (!it.v) return fmt(it.p);
  const ps = it.v.map(v => v.p).filter(p => p != null);
  if (!ps.length) return fmt(null);
  const mn = Math.min(...ps), mx = Math.max(...ps);
  return fmt(mn) + (mx > mn ? '+' : '') + ` · ${it.v.length} вар.`;
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} title={label}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors ${on ? 'bg-[#e8793c]' : 'bg-white/15'}`}>
      <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-[#f2f2f4] transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  );
}

export default function MenuAdmin({ items: initial, cats }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState(''), [onlyStop, setOnlyStop] = useState(false), [err, setErr] = useState('');

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const visible = useMemo(() => items.filter(it => (!onlyStop || it.hidden) && (!q || norm(it.name + ' ' + ru(it.d)).includes(norm(q)))), [items, q, onlyStop]);

  async function patch(id, change) {
    setErr('');
    setItems(xs => xs.map(x => (x.id === id ? { ...x, ...change } : x)));
    try { await api(`/api/admin/items/${id}`, 'PATCH', change); router.refresh(); }
    catch (e) { setErr(e.message); setItems(initial); }
  }
  async function move(cat, id, dir) {
    const list = items.filter(x => x.cat === cat), i = list.findIndex(x => x.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const order = new Map(list.map((x, k) => [x.id, k]));
    setItems(xs => [...xs].sort((a, b) => (a.cat === cat && b.cat === cat ? order.get(a.id) - order.get(b.id) : 0)));
    try { await api('/api/admin/items/reorder', 'POST', { ids: list.map(x => x.id) }); router.refresh(); } catch (e) { setErr(e.message); }
  }

  const stopCount = items.filter(x => x.hidden).length;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-lg tracking-[.08em] uppercase">Меню</h1>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск блюда" className="h-10 w-56 rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-[#e8793c]" />
        <button onClick={() => setOnlyStop(v => !v)} className={`h-10 rounded-xl border px-3 text-sm ${onlyStop ? 'border-[#e8793c] bg-[#e8793c]/15' : 'border-white/15 text-white/75'}`}>Стоп-лист · {stopCount}</button>
        <Link href="/admin/items/new" className="flex h-10 items-center rounded-xl bg-[#f2f2f4] px-4 text-sm font-semibold text-[#050507]">+ Добавить блюдо</Link>
      </div>
      {err && <div className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{err}</div>}

      {cats.map(c => {
        const list = visible.filter(x => x.cat === c.id);
        if (!list.length) return null;
        return (
          <section key={c.id} className="rounded-2xl border border-white/10 bg-[#0e0e13]">
            <h2 className="flex items-baseline justify-between border-b border-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[.12em]">
              {c.name}<span className="text-xs font-medium text-white/40">{list.length}</span>
            </h2>
            <ul>
              {list.map((it, i) => (
                <li key={it.id} className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 ${it.hidden ? 'opacity-55' : ''}`}>
                  <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_35%,rgba(232,121,60,.18),#0c0c10_70%)]">
                    {(it.img || it.media) && <img alt="" src={it.media || `/api/img/${it.img}`} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/items/${it.id}`} className="font-semibold hover:text-[#f2a676]">{it.name}</Link>
                      {it.hit && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">хит</span>}
                      {it.new && <span className="rounded bg-[#e8793c] px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">new</span>}
                      {it.hidden && <span className="rounded border border-[#e8793c]/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#f2a676]">стоп</span>}
                    </div>
                    <div className="truncate text-xs text-white/50">{priceLabel(it)}{ru(it.d) ? ' · ' + ru(it.d) : ''}</div>
                  </div>
                  <div className="flex flex-none items-center gap-1 text-white/60">
                    <button disabled={i === 0} onClick={() => move(c.id, it.id, -1)} className="h-8 w-8 rounded-lg hover:bg-white/10 disabled:opacity-20" aria-label="Выше">↑</button>
                    <button disabled={i === list.length - 1} onClick={() => move(c.id, it.id, 1)} className="h-8 w-8 rounded-lg hover:bg-white/10 disabled:opacity-20" aria-label="Ниже">↓</button>
                  </div>
                  <label className="flex flex-none items-center gap-2 text-xs text-white/60">
                    <span className="hidden sm:inline">{it.hidden ? 'Нет в наличии' : 'В наличии'}</span>
                    <Switch on={!it.hidden} onChange={on => patch(it.id, { hidden: !on })} label="В наличии" />
                  </label>
                  <Link href={`/admin/items/${it.id}`} className="hidden flex-none rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:text-white sm:block">Изменить</Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!visible.length && <div className="py-16 text-center text-white/50">Ничего не найдено</div>}
    </div>
  );
}
