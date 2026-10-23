import OrderDetail from '@/components/staff/OrderDetail';

export const dynamic = 'force-dynamic';

// /staff/o/<id> — one order: approve, serve, edit (the link in the Telegram message leads here)
export default async function OrderPage({ params }) {
  return <OrderDetail id={Number((await params).id)} />;
}
