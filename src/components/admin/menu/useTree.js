'use client';
import { useEffect, useState } from 'react';
import { api } from '../api';

const PINNED = ['promos', 'rules'];
export const nameOf = (n, empty = 'Без названия') => n?.ru || n?.es || n?.en || Object.values(n || {}).find(Boolean) || empty;
const newId = p => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 900 + 100)}`;
const swap = (list, i, k) => { const out = [...list]; [out[i], out[k]] = [out[k], out[i]]; return out; };

// The menu's structure on the «Меню» page: categories (home tiles, `sections`) and their subcategories (`cats`).
// Every change is saved at once; if the server refuses it, the last saved state comes back with its reason.
export default function useTree(initial, onSaved, setErr) {
  const [tree, setTree] = useState(initial);
  useEffect(() => setTree(initial), [initial]);

  async function save(next) {
    const prev = tree;
    setTree(next); setErr('');
    try { await api('/api/admin/menu-tree', 'PUT', next); onSaved(); return true; }
    catch (e) { setErr(e.message); setTree(prev); return false; }
  }
  const secs = tree.sections, at = id => secs.findIndex(s => s.id === id);
  const withSec = (id, f) => save({ ...tree, sections: secs.map(s => (s.id === id ? f(s) : s)) });
  const withCat = (id, patch) => save({ ...tree, cats: { ...tree.cats, [id]: { ...tree.cats[id], ...patch } } });
  const lastDish = secs.findLastIndex(s => !PINNED.includes(s.id));

  // MARK: - Actions
  return {
    tree, lastDish,
    dishSections: secs.filter(s => !PINNED.includes(s.id)),
    renameSection: (id, n) => withSec(id, s => ({ ...s, n })),
    renameCat: (id, n) => withCat(id, { n }),
    hideSection: id => withSec(id, s => ({ ...s, hidden: !s.hidden })),
    hideCat: id => withCat(id, { hidden: !tree.cats[id].hidden }),
    stepSection: (id, d) => { const i = at(id); return save({ ...tree, sections: swap(secs, i, i + d) }); },
    stepCat: (sid, id, d) => withSec(sid, s => { const j = s.cats.indexOf(id); return { ...s, cats: swap(s.cats, j, j + d) }; }),
    addSection: n => {
      const s = { id: newId('s'), n, hidden: false, cats: [] };
      return save({ ...tree, sections: [...secs.slice(0, lastDish + 1), s, ...secs.slice(lastDish + 1)] });
    },
    addCat: (sid, n) => {
      const id = newId('c');
      return save({ cats: { ...tree.cats, [id]: { n, hidden: false } }, sections: secs.map(s => (s.id === sid ? { ...s, cats: [...s.cats, id] } : s)) });
    },
    removeSection: id => save({ ...tree, sections: secs.filter(s => s.id !== id) }),
    removeCat: (sid, id) => withSec(sid, s => ({ ...s, cats: s.cats.filter(x => x !== id) })),
    moveCat: (id, from, to) => save({ ...tree, sections: secs.map(s => (s.id === from ? { ...s, cats: s.cats.filter(x => x !== id) } : s.id === to ? { ...s, cats: [...s.cats, id] } : s)) }),
  };
}
