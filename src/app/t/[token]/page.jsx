import DarkskyMenu from '@/components/DarkskyMenu';
import { getContent, visibleItems } from '@/lib/content';
import { getMenuItems, getTableByToken } from '@/lib/menu-server';

export const dynamic = 'force-dynamic';

// /t/<token> — the link inside a table's QR code. Unknown or disabled tokens fall back to the browse-only menu.
export default async function TableMenu({ params }) {
  const { token } = await params;
  const [items, table, content] = await Promise.all([getMenuItems(), getTableByToken(token), getContent()]);
  return <DarkskyMenu items={visibleItems(items, content)} content={content} table={table ? { number: table.number, label: table.label || null, token: table.token } : null} />;
}
