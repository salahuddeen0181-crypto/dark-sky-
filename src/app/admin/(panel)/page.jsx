import { getMenuItems } from '@/lib/menu-server';
import { EDITABLE_CATS } from '@/lib/item-schema';
import * as D from '@/lib/darksky-data';
import MenuAdmin from '@/components/admin/MenuAdmin';

export default async function MenuPage() {
  const items = await getMenuItems({ includeHidden: true });
  const cats = EDITABLE_CATS.map(id => ({ id, name: D.CATS.find(c => c.id === id).n.ru }));
  return <MenuAdmin items={items} cats={cats} />;
}
