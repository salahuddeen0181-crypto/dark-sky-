'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from './api';
import PhotoPanel from './PhotoPanel';
import { L3, asML, input, label, LangProvider, LangBar } from './L3';

export default function ItemForm({ item, cats, tastes, others, defaultCat }) {
  const router = useRouter();
  const [f, setF] = useState(() => ({
    // guest name in every language; the Spanish one is also the name staff see (Telegram, admin)
    nm: { ...asML(item?.nm), es: item?.nm?.es || item?.name || '' }, cat: item?.cat || defaultCat, hidden: !!item?.hidden, hit: !!item?.hit, new: !!item?.new,
    d: asML(item?.d), m: asML(item?.m), p: item?.p ?? '', onRequest: item ? item.p == null && !item.v : false,
    v: (item?.v || []).map(v => ({ n: asML(v.n), p: v.p ?? '' })), t: item?.t || [], str: item?.str || null,
    pair: item?.pair || [], img: item?.img || null, media: item?.media || null, cut: !!item?.cut,
  }));
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [upl, setUpl] = useState(false);
  const set = patch => setF(x => ({ ...x, ...patch }));

  async function save() {
    setBusy(true); setErr('');
    const body = {
      name: f.nm.es.trim() || Object.values(f.nm).find(x => x.trim()) || '', nm: f.nm, cat: f.cat, hidden: f.hidden, hit: f.hit, new: f.new, d: f.d, m: f.m,
      p: f.onRequest ? null : f.p, v: f.v, t: f.t, str: f.cat === 'hookah' ? f.str : null, pair: f.pair,
      img: f.img, cut: f.cut, keepMedia: !!f.media,
    };
    try {
      const r = item ? await api(`/api/admin/items/${item.id}`, 'PUT', body) : await api('/api/admin/items', 'POST', body);
      router.push('/admin'); router.refresh();
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Удалить «${item.name}» из меню навсегда? Если блюдо просто закончилось, лучше выключить «В наличии».`)) return;
    setBusy(true);
    try { await api(`/api/admin/items/${item.id}`, 'DELETE'); router.push('/admin'); router.refresh(); }
    catch (x) { setErr(x.message); setBusy(false); }
  }

  const pairOptions = others.filter(o => o.id !== item?.id && !f.pair.includes(o.id));
  return (
    <LangProvider data={{ nm: f.nm, d: f.d, v: f.v }}>{/* weight/volume is usually the same in every language: not counted */}
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70">← Меню</Link>
        <h1 className="font-display text-lg uppercase tracking-[.08em]">{item ? 'Изменить блюдо' : 'Новое блюдо'}</h1>
      </div>
      <LangBar />

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <PhotoPanel img={f.img} media={f.media} cut={f.cut} onChange={set} onBusy={setUpl} />

        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="flex flex-col gap-2"><span className={label}>Название <span className="normal-case tracking-normal text-white/35">— испанское видит персонал</span></span><L3 value={f.nm} onChange={nm => set({ nm })} placeholder="Philadelphia" /></div>
            <label className="flex flex-col gap-2"><span className={label}>Категория</span>
              <select value={f.cat} onChange={e => set({ cat: e.target.value })} className={input}>{cats.map(c => <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>)}</select>
            </label>
          </div>

          <div className="flex flex-col gap-2"><span className={label}>Описание</span><L3 area value={f.d} onChange={d => set({ d })} placeholder="Состав, подача…" /></div>
          <div className="flex flex-col gap-2"><span className={label}>Вес / объём <span className="normal-case tracking-normal text-white/35">— если одинаково на всех языках, достаточно испанского</span></span><L3 value={f.m} onChange={m => set({ m })} placeholder="300 g" /></div>

          <div className="flex flex-col gap-2">
            <span className={label}>Цена</span>
            {f.v.length === 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <input type="number" min="0" disabled={f.onRequest} value={f.p} onChange={e => set({ p: e.target.value })} className={`${input} w-40 disabled:opacity-40`} placeholder="25941" />
                <label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={f.onRequest} onChange={e => set({ onRequest: e.target.checked })} /> Цена по запросу</label>
              </div>
            ) : <div className="text-sm text-white/50">Цена задаётся у каждого варианта ниже</div>}
          </div>

          <div className="flex flex-col gap-2">
            <span className={label}>Варианты <span className="normal-case tracking-normal text-white/35">— вкус, размер, начинка; гость выбирает один</span></span>
            {f.v.map((v, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-white/10 p-3">
                <L3 value={v.n} onChange={n => set({ v: f.v.map((x, k) => (k === i ? { ...x, n } : x)) })} placeholder="Вариант" />
                <div className="flex items-center gap-3">
                  <input type="number" min="0" value={v.p} onChange={e => set({ v: f.v.map((x, k) => (k === i ? { ...x, p: e.target.value } : x)) })} className={`${input} w-40`} placeholder="Цена" />
                  <button onClick={() => set({ v: f.v.filter((_, k) => k !== i) })} className="ml-auto text-sm text-white/50 hover:text-[#f2a676]">Удалить вариант</button>
                </div>
              </div>
            ))}
            <button onClick={() => set({ v: [...f.v, { n: asML(''), p: f.p || '' }] })} className="h-10 self-start rounded-xl border border-dashed border-white/25 px-4 text-sm text-white/75">+ Вариант</button>
          </div>

          <div className="flex flex-col gap-2">
            <span className={label}>Вкус <span className="normal-case tracking-normal text-white/35">— до 4</span></span>
            <div className="flex flex-wrap gap-2">
              {tastes.map(t => {
                const on = f.t.includes(t.k);
                return <button key={t.k} onClick={() => set({ t: on ? f.t.filter(x => x !== t.k) : [...f.t, t.k].slice(0, 4) })} className={`rounded-lg border px-3 py-1.5 text-sm ${on ? 'border-[#e8793c] bg-[#e8793c]/15 text-[#f6c3a3]' : 'border-white/15 text-white/70'}`}>{t.name}</button>;
              })}
            </div>
          </div>

          {f.cat === 'hookah' && (
            <div className="flex flex-col gap-2">
              <span className={label}>Крепость (0–10)</span>
              <div className="flex items-center gap-3 text-sm">
                от <input type="number" min="0" max="10" value={f.str?.[0] ?? ''} onChange={e => set({ str: [e.target.value, f.str?.[1] ?? e.target.value] })} className={`${input} w-20`} />
                до <input type="number" min="0" max="10" value={f.str?.[1] ?? ''} onChange={e => set({ str: [f.str?.[0] ?? 0, e.target.value] })} className={`${input} w-20`} />
                {f.str && <button onClick={() => set({ str: null })} className="text-white/50 hover:text-white">не показывать</button>}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className={label}>С этим берут <span className="normal-case tracking-normal text-white/35">— если пусто, подбор по категории</span></span>
            <div className="flex flex-wrap gap-2">
              {f.pair.map(id => {
                const o = others.find(x => x.id === id);
                return <button key={id} onClick={() => set({ pair: f.pair.filter(x => x !== id) })} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80">{o ? o.name : id} ✕</button>;
              })}
              {f.pair.length < 6 && (
                <select value="" onChange={e => e.target.value && set({ pair: [...f.pair, e.target.value] })} className={`${input} h-9 w-56 text-sm`}>
                  <option value="" className="bg-[#111]">+ добавить…</option>
                  {pairOptions.map(o => <option key={o.id} value={o.id} className="bg-[#111]">{o.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.hit} onChange={e => set({ hit: e.target.checked })} /> Хит</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.new} onChange={e => set({ new: e.target.checked })} /> Новинка</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.hidden} onChange={e => set({ hidden: e.target.checked })} /> Стоп-лист (скрыть из меню)</label>
          </div>

          {err && <div className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{err}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={busy || upl} onClick={save} className="h-12 rounded-xl bg-[#f2f2f4] px-6 font-semibold text-[#050507] disabled:opacity-60">{busy ? 'Сохраняем…' : 'Сохранить'}</button>
            <Link href="/admin" className="h-12 rounded-xl border border-white/15 px-5 leading-[48px] text-white/75">Отмена</Link>
            {item && <button disabled={busy} onClick={remove} className="ml-auto text-sm text-white/45 hover:text-[#f2a676]">Удалить блюдо</button>}
          </div>
        </div>
      </div>
    </div>
    </LangProvider>
  );
}
