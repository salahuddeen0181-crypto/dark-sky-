import 'server-only';
import { getContent, editableCats } from './content';

// Option lists for the admin item editor (Russian labels); taste tags as edited in Контент → Вкусы.
export async function itemFormProps(all) {
  const { TASTE } = await getContent();
  return {
    cats: await editableCats(),
    tastes: Object.entries(TASTE).map(([k, v]) => ({ k, name: v.ru || v.es || v.en || k })),
    others: all.map(x => ({ id: x.id, name: x.name, cat: x.cat })),
  };
}
