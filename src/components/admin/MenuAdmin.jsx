'use client';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ru, fmt, thumb } from './api';

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
  // MARK: - Drag to reorder (mouse or finger) by the ⋮⋮ handle; saved when the dish is let go.
  // The dragged row follows the pointer; the others glide out of its way (FLIP: the layout jumps, a transform
  // takes each row from where it was to its new place). Only on the full list: with a search or the stop-list
  // filter some dishes are out of sight.
  const [drag, setDrag] = useState(null); // { cat, id } — for the look of the row being dragged
  const dragging = useRef(null), order = useRef(null); // read by the pointer handlers between renders
  const lists = useRef({}); // category → its <ul>
  const before = useRef(null); // row id → its top on screen just before a reorder
  const latest = useRef(items); latest.current = items; // the list as the last move left it
  const filtered = !!q || onlyStop;
  const rowsOf = cat => [...(lists.current[cat]?.children || [])];

  // the dragged row sits under the pointer, wherever its slot in the layout is now
  function follow() {
    const d = dragging.current, el = d && rowsOf(d.cat).find(r => r.dataset.id === d.id);
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${d.y - d.grab - el.offsetTop}px)`;
  }
  useLayoutEffect(() => {
    const d = dragging.current, prev = before.current;
    before.current = null;
    if (!d || !prev) return;
    for (const el of rowsOf(d.cat)) {
      if (el.dataset.id === d.id || prev[el.dataset.id] == null) continue;
      const dy = prev[el.dataset.id] - el.getBoundingClientRect().top;
      if (!dy) continue;
      el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`;
      el.getBoundingClientRect(); // commit the start position before animating from it
      el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; el.style.transform = '';
    }
    follow();
  }, [items]);

  function startDrag(e, cat, id) {
    if (filtered || e.button > 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not a live pointer: moves still reach the handle */ }
    const el = e.currentTarget.closest('li'), ul = lists.current[cat];
    const y = e.clientY - ul.getBoundingClientRect().top; // pointer within the list
    dragging.current = { cat, id, y, grab: y - el.offsetTop, h: el.offsetHeight }; order.current = null;
    setDrag({ cat, id });
  }
  function dragMove(e) {
    const d = dragging.current;
    if (!d) return;
    d.y = e.clientY - lists.current[d.cat].getBoundingClientRect().top;
    follow();
    // the dragged row's middle passes the middle of a neighbour → they swap (layout positions, steady while gliding)
    const mid = d.y - d.grab + d.h / 2, rows = rowsOf(d.cat);
    const to = rows.filter(r => r.dataset.id !== d.id && r.offsetTop + r.offsetHeight / 2 < mid).length;
    const xs = latest.current, list = xs.filter(x => x.cat === d.cat), from = list.findIndex(x => x.id === d.id);
    if (from === to) return;
    before.current = Object.fromEntries(rows.map(r => [r.dataset.id, r.getBoundingClientRect().top]));
    const [it] = list.splice(from, 1); list.splice(to, 0, it);
    let k = 0;
    latest.current = xs.map(x => (x.cat === d.cat ? list[k++] : x));
    order.current = list.map(x => x.id);
    setItems(latest.current);
  }
  async function endDrag(e) {
    const d = dragging.current;
    if (!d) return;
    dragMove(e); // a quick drag may end without a move event
    dragging.current = null; setDrag(null);
    // the row settles into its slot
    const el = rowsOf(d.cat).find(r => r.dataset.id === d.id);
    if (el) { el.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; }
    const ids = order.current; order.current = null;
    if (!ids) return; // let go where it was
    try { await api('/api/admin/items/reorder', 'POST', { ids }); router.refresh(); } catch (err) { setErr(err.message); setItems(initial); }
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
      <p className="-mt-3 text-xs text-white/45">{filtered ? 'Чтобы менять порядок, очистите поиск и снимите «Стоп-лист».' : 'Порядок блюд — перетащите за ⋮⋮ слева.'}</p>

      {cats.map(c => {
        const list = visible.filter(x => x.cat === c.id);
        if (!list.length) return null;
        return (
          <section key={c.id} className="rounded-2xl border border-white/10 bg-[#0e0e13]">
            <h2 className="flex items-baseline justify-between border-b border-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[.12em]">
              {c.name}<span className="text-xs font-medium text-white/40">{list.length}</span>
            </h2>
            <ul ref={el => { lists.current[c.id] = el; }} className="relative">
              {list.map(it => (
                <li key={it.id} data-id={it.id} className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 ${it.hidden ? 'opacity-55' : ''} ${drag?.id === it.id ? 'relative z-10 rounded-xl bg-[#1d1d26] shadow-[0_8px_24px_rgba(0,0,0,.5)] outline outline-1 outline-[#e8793c]/60' : ''}`}>
                  <button type="button" aria-label="Перетащить" title={filtered ? '' : 'Перетащить'} disabled={filtered}
                    onPointerDown={e => startDrag(e, c.id, it.id)} onPointerMove={dragMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                    className={`-ml-2 flex h-10 w-6 flex-none touch-none select-none items-center justify-center rounded text-lg leading-none text-white/35 hover:text-white/80 disabled:opacity-0 ${drag?.id === it.id ? 'cursor-grabbing text-[#f2a676]' : 'cursor-grab'}`}>⋮⋮</button>
                  <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_35%,rgba(232,121,60,.18),#0c0c10_70%)]">
                    {(it.img || it.media) && <img alt="" src={thumb(it.img, it.media)} className="h-full w-full object-cover" />}
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
