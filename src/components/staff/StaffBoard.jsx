'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import OrderCard from './OrderCard';
import { ShiftBar, useActor } from './Who';
import { staffApi, forget } from './session';
import { useMe } from './useMe';
import * as alerts from './alerts';

const TABS = [['new', 'Новые'], ['accepted', 'Одобрены'], ['served', 'Поданы']];
const POLL = 3000;

// Staff board: polls the open orders, rings on new ones, approve → served; the full order is on /staff/o/<id>.
export default function StaffBoard() {
  const s = useMe(), { ask, picker } = useActor(s);
  const [orders, setOrders] = useState(null), [tab, setTab] = useState('new'), [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(false), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const seen = useRef(null);

  // MARK: - Polling
  const load = useCallback(async () => {
    const r = await staffApi('/api/staff/orders').catch(() => null);
    if (!r) return; // offline for a moment (or redirected to sign in): next tick
    // first load only remembers what is there; after that every unseen "new" order rings
    if (seen.current) r.orders.filter(o => o.status === 'new' && !seen.current.has(o.id)).forEach(alerts.announce);
    seen.current = new Set(r.orders.map(o => o.id));
    setOrders(r.orders); setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!s.ready) return;
    load();
    const t = setInterval(load, POLL);
    const vis = () => { if (!document.hidden) { load(); alerts.keepAwake(); } };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [load, s.ready]);

  const fresh = orders ? orders.filter(o => o.status === 'new').length : 0;
  useEffect(() => { document.title = (fresh ? `(${fresh}) ` : '') + 'Заказы · DARKSKY'; }, [fresh]);

  // MARK: - Actions
  async function act(id, action) {
    const who = await ask();
    if (!who) return;
    setBusy(true); setMsg('');
    try {
      const { order } = await staffApi(`/api/staff/orders/${id}`, 'POST', { action, ...who });
      setOrders(list => list.map(o => (o.id === id ? order : o)));
      s.reload();
    } catch (e) { setMsg(e.message); load(); } finally { setBusy(false); }
  }
  async function logout() { await staffApi('/api/staff/logout', 'POST').catch(() => {}); forget(); location.href = '/staff/login'; }

  // MARK: - View
  const shown = (orders || []).filter(o => (tab === 'served' ? o.status === 'served' || o.status === 'failed' : o.status === tab));
  if (tab !== 'served') shown.reverse(); // open orders: oldest first, they wait longest
  const count = k => (orders || []).filter(o => o.status === k).length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur">
        <span className="font-display tracking-[.14em]">DARKSKY</span>
        <nav className="flex gap-1">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm ${tab === k ? 'bg-white/15 text-white' : 'text-white/65'}`}>
              {l}{k !== 'served' && count(k) > 0 && <span className={`ml-2 rounded-md px-1.5 text-xs font-bold ${k === 'new' ? 'bg-[#e8793c] text-black' : 'bg-white/15'}`}>{count(k)}</span>}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          {!sound && <button onClick={async () => { await alerts.enable(); setSound(alerts.enabled()); }} className="h-10 rounded-lg bg-[#e8793c] px-3 font-semibold text-black">🔔 Включить звук</button>}
          {s.me?.via !== 'tg' && <button onClick={logout} className="h-10 rounded-lg border border-white/15 px-3 text-white/70">Выйти</button>}
        </div>
      </header>

      <ShiftBar s={s} />
      {msg && <div role="alert" className="rounded-xl border border-[#e8793c]/50 bg-[#e8793c]/10 px-4 py-3 text-sm text-[#f6c3a3]">{msg}</div>}
      {!orders && <div className="py-16 text-center text-white/50">Загрузка…</div>}
      {orders && !shown.length && <div className="py-16 text-center text-white/50">{tab === 'new' ? 'Новых заказов нет — страница обновляется сама' : 'Пусто'}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(o => <OrderCard key={o.id} o={o} now={now} busy={busy} onAction={act} />)}
      </div>
      {picker}
    </div>
  );
}
