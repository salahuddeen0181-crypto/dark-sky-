'use client';
import { useState } from 'react';
import { api } from './api';

const btn = 'h-9 rounded-lg border border-white/15 px-3 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40';

// A waiter's personal PIN for the staff app: generate, set by hand, remove. A new PIN is shown once.
export function StaffPin({ s, onChange }) {
  const [own, setOwn] = useState(null), [shown, setShown] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function save(pin) {
    setBusy(true); setErr('');
    try { const r = await api(`/api/admin/staff/${s.id}`, 'PATCH', { pin }); setShown(r.pin || ''); setOwn(null); onChange(); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-2 border-t border-white/5 pt-2 text-sm">
      <span className={s.has_pin ? 'text-white/70' : 'text-white/40'}>{s.has_pin ? 'PIN задан' : 'Без PIN'}</span>
      {shown && <span className="rounded-md bg-[#e8793c]/15 px-2 py-1 text-[#f6c3a3]">Новый PIN: <b className="tracking-[.2em] text-white">{shown}</b> — передайте сотруднику, больше не покажется</span>}
      {own !== null ? (
        <>
          <input autoFocus inputMode="numeric" placeholder="4–6 цифр" value={own} onChange={e => setOwn(e.target.value.replace(/\D/g, '').slice(0, 6))} className="h-9 w-28 rounded-lg border border-white/15 bg-white/5 px-2 tracking-[.2em] outline-none focus:border-[#e8793c]" />
          <button disabled={busy || own.length < 4} onClick={() => save(own)} className={btn}>Сохранить</button>
          <button onClick={() => setOwn(null)} className="text-white/45">Отмена</button>
        </>
      ) : (
        <>
          <button disabled={busy} onClick={() => save('auto')} className={btn}>{s.has_pin ? 'Новый PIN' : 'Сгенерировать PIN'}</button>
          <button disabled={busy} onClick={() => setOwn('')} className={btn}>Свой PIN</button>
          {s.has_pin && <button disabled={busy} onClick={() => confirm(`Убрать PIN у ${s.name}? Войти по нему будет нельзя.`) && save(null)} className={btn}>Убрать</button>}
        </>
      )}
      {err && <span className="text-[#f2a676]">{err}</span>}
    </div>
  );
}

// A waiter without Telegram: name (+ optional own PIN, otherwise generated) → in the team at once
export function AddStaff({ onChange }) {
  const [name, setName] = useState(''), [pin, setPin] = useState(''), [res, setRes] = useState(null), [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault(); setBusy(true);
    try { const r = await api('/api/admin/staff', 'POST', { name, pin: pin || 'auto' }); setRes([true, `${name}: PIN ${r.pin} — передайте сотруднику, больше не покажется`]); setName(''); setPin(''); onChange(); }
    catch (x) { setRes([false, x.message]); }
    setBusy(false);
  }
  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/20 p-3 text-sm">
      <span className="text-white/60">Добавить сотрудника без Telegram:</span>
      <input required placeholder="Имя" value={name} onChange={e => setName(e.target.value)} className="h-10 w-44 rounded-lg border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]" />
      <input inputMode="numeric" placeholder="PIN (иначе сгенерируем)" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className="h-10 w-52 rounded-lg border border-white/15 bg-white/5 px-3 outline-none focus:border-[#e8793c]" />
      <button disabled={busy} className="h-10 rounded-lg bg-[#f2f2f4] px-4 font-semibold text-[#050507] disabled:opacity-50">Добавить</button>
      {res && <span className={`w-full ${res[0] ? 'text-[#f6c3a3]' : 'text-[#f2a676]'}`}>{res[1]}</span>}
    </form>
  );
}
