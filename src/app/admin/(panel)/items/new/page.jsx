import { getMenuItems } from '@/lib/menu-server';
import { EDITABLE_CATS } from '@/lib/item-schema';
import { itemFormProps } from '@/lib/admin-form';
import ItemForm from '@/components/admin/ItemForm';

export default async function NewItem({ searchParams }) {
  const { cat } = await searchParams;
  const all = await getMenuItems({ includeHidden: true });
  return <ItemForm item={null} defaultCat={EDITABLE_CATS.includes(cat) ? cat : 'starters'} {...(await itemFormProps(all))} />;
}
