import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/orders';
import OrderEditor from '@/components/admin/OrderEditor';

export default async function OrderPage({ params }) {
  const o = await getOrder(Number((await params).id));
  if (!o) notFound();
  return <OrderEditor order={JSON.parse(JSON.stringify(o))} />;
}
