'use client';
import { useState } from 'react';
import { L3, LangBar, LangProvider, asML } from '../L3';

// A category's or subcategory's name in every language: typed in one, «Перевести пустые поля» fills the rest.
export default function NameDialog({ title, value, onSave, onClose }) {
  const [form, setForm] = useState({ n: asML(value) }), [busy, setBusy] = useState(false);
  const filled = Object.values(form.n).some(v => v.trim());
  async function save() {
    setBusy(true);
    const ok = await onSave(form.n);
    setBusy(false);
    if (ok !== false) onClose();
  }
  return (
    <div role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && !busy && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0e0e13] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 sm:rounded-3xl">
        <h2 className="font-display text-base uppercase tracking-[.08em]">{title}</h2>
        <LangProvider data={form} onFill={setForm}>
          <LangBar />
          <L3 value={form.n} onChange={n => setForm({ n })} placeholder="Название" autoFocus />
        </LangProvider>
        <p className="text-xs text-white/45">Достаточно одного языка: остальные можно перевести кнопкой выше, а пустой язык гость увидит по-английски или по-испански.</p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={busy} className="h-12 flex-1 rounded-xl border border-white/15 text-sm text-white/75">Отмена</button>
          <button onClick={save} disabled={busy || !filled} className="h-12 flex-1 rounded-xl bg-[#f2f2f4] text-sm font-semibold text-[#050507] disabled:opacity-50">{busy ? 'Сохраняем…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}
