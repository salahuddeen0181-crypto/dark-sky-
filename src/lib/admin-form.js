import 'server-only';
import { EDITABLE_CATS } from './item-schema';
import * as D from './darksky-data';

// Option lists for the admin item editor (Russian labels).
export function itemFormProps(all) {
  return {
    cats: EDITABLE_CATS.map(id => ({ id, name: D.CATS.find(c => c.id === id).n.ru })),
    tastes: Object.entries(D.TASTE).map(([k, v]) => ({ k, name: v.ru })),
    others: all.map(x => ({ id: x.id, name: x.name, cat: x.cat })),
  };
}
