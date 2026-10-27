'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

export default function TablesAdmin({ tables, base }) {
  const router = useRouter();
  const [n, setN] = useState(1), [label, setLabel] = useState(''), [err, setErr] = useState(''), [copied, setCopied] = useState(null);
  const [names, setNames] = useState({}); // labels being typed, by table id
  const nameOf = t => t.label || `Стол ${t.number}`;
  const run = async fn => { setErr(''); try { await fn(); router.refresh(); } catch (e) { setErr(e.message); } };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-lg uppercase tracking-[.08em]">Столы и QR</h1>
        <a href="/admin/print" target="_blank" className="flex h-10 items-center rounded-xl bg-[#f2f2f4] px-4 text-sm font-semibold text-[#050507]">Распечатать QR-коды</a>
      </div>
      {base.startsWith('http://') && (
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
          Сайт сейчас открыт по адресу <b>{base}</b> — QR-коды ведут туда же. Печатайте их, когда сайт будет на постоянном домене (или задайте SITE_URL).
        </div>
      )}
      {err && <div className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{err}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map(t => (
          <div key={t.id} className={`flex gap-3 rounded-2xl border border-white/10 bg-[#0e0e13] p-3 ${t.active ? '' : 'opacity-50'}`}>
            <div className="h-24 w-24 flex-none overflow-hidden rounded-lg bg-white p-1" dangerouslySetInnerHTML={{ __html: t.svg }} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-lg">{nameOf(t)}</span>
                <span className="flex-none text-xs text-white/40">{t.label ? `№ ${t.number} · ` : ''}{t.orders} зак.</span>
              </div>
              {/* the table's own name instead of its number: shown to the guest, on the printed QR, to the waiters */}
              <div className="flex gap-1.5">
                <input value={names[t.id] ?? t.label ?? ''} onChange={e => setNames({ ...names, [t.id]: e.target.value })} placeholder={`Подпись, напр. VIP 1`} maxLength={24}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-sm outline-none focus:border-[#e8793c]" />
                {(names[t.id] ?? t.label ?? '') !== (t.label ?? '') && (
                  <button onClick={() => run(async () => { await api(`/api/admin/tables/${t.id}`, 'PATCH', { label: names[t.id] }); setNames(({ [t.id]: _, ...rest }) => rest); })} className="h-8 rounded-lg bg-[#f2f2f4] px-3 text-xs font-semibold text-[#050507]">Сохранить</button>
                )}
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(t.url); setCopied(t.id); setTimeout(() => setCopied(null), 1200); }} className="truncate text-left text-xs text-white/50 hover:text-white" title="Скопировать ссылку">
                {copied === t.id ? 'Скопировано ✓' : t.url.replace(/^https?:\/\//, '')}
              </button>
              <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <button onClick={() => run(() => api(`/api/admin/tables/${t.id}`, 'PATCH', { active: !t.active }))} className="text-white/70 hover:text-white">{t.active ? 'Выключить' : 'Включить'}</button>
                <button onClick={() => confirm(`Новая ссылка для «${nameOf(t)}»? Старый QR-код перестанет работать — его нужно будет перепечатать.`) && run(() => api(`/api/admin/tables/${t.id}`, 'PATCH', { regenerate: true }))} className="text-white/70 hover:text-white">Новая ссылка</button>
                <button onClick={() => confirm(`Удалить «${nameOf(t)}»?`) && run(() => api(`/api/admin/tables/${t.id}`, 'DELETE'))} className="text-white/45 hover:text-[#f2a676]">Удалить</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-white/20 p-4">
        <span className="text-sm text-white/70">Добавить столов:</span>
        <input type="number" min="1" max="50" value={n} onChange={e => setN(e.target.value)} className="h-10 w-20 rounded-xl border border-white/15 bg-white/5 px-3 outline-none" />
        <button onClick={() => run(() => api('/api/admin/tables', 'POST', { count: n }))} className="h-10 rounded-xl border border-white/20 px-4 text-sm">Добавить</button>
        <span className="text-xs text-white/40">Номера продолжат нумерацию после последнего стола.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-white/20 p-4">
        <span className="text-sm text-white/70">Стол с подписью:</span>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="VIP 1" maxLength={24} className="h-10 w-40 rounded-xl border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]" />
        <button disabled={!label.trim()} onClick={() => run(async () => { await api('/api/admin/tables', 'POST', { label }); setLabel(''); })} className="h-10 rounded-xl border border-white/20 px-4 text-sm disabled:opacity-40">Добавить</button>
        <span className="text-xs text-white/40">На QR-карточке, у гостя и у официантов будет «VIP 1» вместо «Стол 24». Подпись можно поменять у любого стола выше.</span>
      </div>
    </div>
  );
}
