import DarkskyMenu from '@/components/DarkskyMenu';
import { getMenuItems, getTableByToken } from '@/lib/menu-server';

export const dynamic = 'force-dynamic';

// /t/<token> — the link inside a table's QR code. Unknown or disabled tokens fall back to the browse-only menu.
export default async function TableMenu({ params }) {
  const { token } = await params;
  const [items, table] = await Promise.all([getMenuItems(), getTableByToken(token)]);
  return <DarkskyMenu items={items} table={table ? { number: table.number, token: table.token } : null} />;
}
