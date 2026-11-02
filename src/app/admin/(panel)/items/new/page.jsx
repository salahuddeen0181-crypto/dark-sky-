import { getMenuItems } from '@/lib/menu-server';
import { itemFormProps } from '@/lib/admin-form';
import ItemForm from '@/components/admin/ItemForm';

export default async function NewItem({ searchParams }) {
  const { cat } = await searchParams;
  const all = await getMenuItems({ includeHidden: true });
  const props = await itemFormProps(all);
  return <ItemForm item={null} defaultCat={props.cats.some(c => c.id === cat) ? cat : props.cats[0]?.id} {...props} />;
}
