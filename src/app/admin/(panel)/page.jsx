import { getMenuItems } from '@/lib/menu-server';
import { getContent, getTreeForm } from '@/lib/content';
import MenuAdmin from '@/components/admin/MenuAdmin';

const ru = o => (o && typeof o === 'object' ? o.ru || o.en || o.es || '' : o || '');

export default async function MenuPage() {
  const items = await getMenuItems({ includeHidden: true });
  const tree = await getTreeForm();
  // only what the list shows (a dish's every language and details stay out of the page)
  const rows = items.map(({ id, cat, name, d, hidden, hit, p, v, img, media, ...it }) => ({
    id, cat, name, d: ru(d), hidden: !!hidden, hit: !!hit, new: !!it.new, b: it.b, p: p ?? null, v: v ? v.map(x => ({ p: x.p ?? null })) : undefined, img: img || null, media: media || null,
  }));
  const badges = (await getContent()).BADGES.map(({ k, n, bg, color }) => ({ k, bg, color, name: ru(n) }));
  return <MenuAdmin items={rows} tree={tree} badges={badges} />;
}
