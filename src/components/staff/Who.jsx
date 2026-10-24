'use client';
import { useRef, useState } from 'react';

const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

// Top strip: the signed-in waiter and their shift, or (bar tablet) who is on shift now
export function ShiftBar({ s }) {
  if (!s.ready) return null;
  if (s.me?.kind === 'waiter') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <span>Вы: <b>{s.me.name}</b></span>
        {s.shift
          ? <><span className="text-[#9fd8a8]">на смене с {hhmm(s.shift.started_at)}</span><button onClick={() => confirm('Закончить смену?') && s.shift_('end')} className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-white/75">Закончить смену</button></>
          : <><span className="text-[#f2a676]">смена не начата</span><button onClick={() => s.shift_('start')} className="ml-auto rounded-lg bg-[#e8793c] px-3 py-1.5 font-semibold text-black">Начать смену</button></>}
      </div>
    );
  }
  if (!s.named) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <span className="text-white/55">На смене:</span>
      {s.onShift?.length ? s.onShift.map(w => <span key={w.id} className="rounded-md bg-white/10 px-2 py-0.5">{w.name} <span className="text-white/45">с {hhmm(w.started_at)}</span></span>)
        : <span className="text-[#f2a676]">никого — официанты начинают смену в приложении у себя в Telegram</span>}
    </div>
  );
}

// Who approves / serves. A waiter signed in as themselves (Telegram or a personal PIN) is themselves; on the shared tablet a waiter on shift is
// picked; without a database (no accounts) — a typed name. ask() → extra body fields, or null if cancelled.
export function useActor(s) {
  const [open, setOpen] = useState(false), [name, setName] = useState(''), done = useRef(null);
  function ask() {
    if (s.me?.kind === 'waiter') return Promise.resolve({});
    return new Promise(res => { done.current = res; setOpen(true); });
  }
  const finish = v => { setOpen(false); done.current?.(v); };
  const picker = open && (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => finish(null)}>
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-[#111116] p-4" onClick={e => e.stopPropagation()}>
        <div className="font-semibold">Кто берёт заказ?</div>
        {s.named ? (
          s.onShift?.length
            ? s.onShift.map(w => <button key={w.id} onClick={() => finish({ staffId: w.id })} className="h-12 rounded-xl border border-white/15 text-left px-4 hover:bg-white/5">{w.name}</button>)
            : <div className="text-sm text-[#f2a676]">Никого нет на смене. Официант начинает смену у себя в Telegram-приложении (или командой /smena боту).</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (name.trim()) finish({ by: name.trim() }); }} className="flex gap-2">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Имя официанта" className="h-12 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 outline-none" />
            <button className="h-12 rounded-xl bg-[#f2f2f4] px-4 font-semibold text-[#050507]">OK</button>
          </form>
        )}
        <button onClick={() => finish(null)} className="text-sm text-white/50">Отмена</button>
      </div>
    </div>
  );
  return { ask, picker };
}
