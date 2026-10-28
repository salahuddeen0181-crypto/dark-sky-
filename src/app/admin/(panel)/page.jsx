import { getMenuItems } from '@/lib/menu-server';
import { EDITABLE_CATS } from '@/lib/item-schema';
import * as D from '@/lib/darksky-data';
import MenuAdmin from '@/components/admin/MenuAdmin';

const ru = o => (o && typeof o === 'object' ? o.ru || o.en || o.es || '' : o || '');

export default async function MenuPage() {
  const items = await getMenuItems({ includeHidden: true });
  const cats = EDITABLE_CATS.map(id => ({ id, name: D.CATS.find(c => c.id === id).n.ru }));
  // only what the list shows (a dish's every language and details stay out of the page)
  const rows = items.map(({ id, cat, name, d, hidden, hit, p, v, img, media, ...it }) => ({
    id, cat, name, d: ru(d), hidden: !!hidden, hit: !!hit, new: !!it.new, p: p ?? null, v: v ? v.map(x => ({ p: x.p ?? null })) : undefined, img: img || null, media: media || null,
  }));
  return <MenuAdmin items={rows} cats={cats} />;
}
