import { notFound } from 'next/navigation';
import { getMenuItem, getMenuItems } from '@/lib/menu-server';
import { itemFormProps } from '@/lib/admin-form';
import ItemForm from '@/components/admin/ItemForm';

export default async function EditItem({ params }) {
  const { id } = await params;
  const [item, all] = await Promise.all([getMenuItem(id), getMenuItems({ includeHidden: true })]);
  if (!item) notFound();
  return <ItemForm item={item} {...(await itemFormProps(all))} />;
}
