'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../api';
import SectionsEditor from './SectionsEditor';
import PromosEditor from './PromosEditor';
import RulesEditor from './RulesEditor';
import { LangProvider, LangBar } from '../L3';

const TABS = [['sections', 'Разделы и категории'], ['promos', 'Акции'], ['rules', 'Правила']];

// Menu texts outside the dishes, typed in every language; one save for everything.
export default function ContentForm({ initial }) {
  const router = useRouter();
  const [c, setC] = useState(initial), [tab, setTab] = useState('sections');
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null), [dirty, setDirty] = useState(false);
  const set = patch => { setC(x => ({ ...x, ...patch })); setDirty(true); setMsg(null); };

  async function save() {
    setBusy(true); setMsg(null);
    try {
      await api('/api/admin/content', 'PUT', {
        ...c,
        sections: Object.fromEntries(c.sections.map(s => [s.id, { n: s.n, tag: s.tag }])),
        order: Object.fromEntries(c.sections.map(s => [s.id, s.cats])),
      });
      setMsg(['ok', 'Сохранено']);
      setDirty(false); router.refresh();
    } catch (x) { setMsg(['warn', x.message]); }
    setBusy(false);
  }

  return (
    <LangProvider data={c}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg uppercase tracking-[.08em]">Контент</h1>
        <nav className="flex gap-1 rounded-xl border border-white/10 p-1 text-sm">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 ${tab === k ? 'bg-white/15 text-white' : 'text-white/60'}`}>{l}</button>)}
        </nav>
      </div>
      <p className="-mt-2 text-xs text-white/45">Тексты вводятся на каждом языке вручную. Если язык пустой, гость увидит английский или испанский вариант.</p>
      <LangBar />

      {tab === 'sections' && <SectionsEditor c={c} set={set} />}
      {tab === 'promos' && <PromosEditor c={c} set={set} />}
      {tab === 'rules' && <RulesEditor c={c} set={set} />}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur">
        <button disabled={busy || !dirty} onClick={save} className="h-12 rounded-xl bg-[#f2f2f4] px-6 font-semibold text-[#050507] disabled:opacity-50">{busy ? 'Сохраняем…' : 'Сохранить'}</button>
        {msg && <span className={`text-sm ${msg[0] === 'ok' ? 'text-[#9fd8a8]' : 'text-[#f2a676]'}`}>{msg[1]}</span>}
        {dirty && !msg && <span className="text-sm text-white/45">Есть несохранённые изменения</span>}
      </div>
    </div>
    </LangProvider>
  );
}
