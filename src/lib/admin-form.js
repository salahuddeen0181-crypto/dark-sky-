import 'server-only';
import { EDITABLE_CATS } from './item-schema';
import * as D from './darksky-data';
import { getContent } from './content';

// Option lists for the admin item editor (Russian labels); taste tags as edited in Контент → Вкусы.
export async function itemFormProps(all) {
  const { TASTE } = await getContent();
  return {
    cats: EDITABLE_CATS.map(id => ({ id, name: D.CATS.find(c => c.id === id).n.ru })),
    tastes: Object.entries(TASTE).map(([k, v]) => ({ k, name: v.ru || v.es || v.en || k })),
    others: all.map(x => ({ id: x.id, name: x.name, cat: x.cat })),
  };
}
