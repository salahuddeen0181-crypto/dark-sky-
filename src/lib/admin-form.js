import 'server-only';
import { getContent, editableCats } from './content';

// Option lists for the admin item editor (Russian labels); taste tags as edited in Контент → Вкусы.
export async function itemFormProps(all) {
  const { TASTE, BADGES } = await getContent();
  return {
    cats: await editableCats(),
    badges: BADGES.filter(b => b.k !== 'hit' && b.k !== 'new').map(b => ({ k: b.k, name: b.n.ru || b.n.es || b.n.en || Object.values(b.n)[0] || b.k })),
    hitName: BADGES.find(b => b.k === 'hit').n, newName: BADGES.find(b => b.k === 'new').n,
    tastes: Object.entries(TASTE).map(([k, v]) => ({ k, name: v.ru || v.es || v.en || k })),
    others: all.map(x => ({ id: x.id, name: x.name, cat: x.cat })),
  };
}
