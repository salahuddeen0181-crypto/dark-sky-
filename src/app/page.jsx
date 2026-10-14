import DarkskyMenu from '@/components/DarkskyMenu';
import { getMenuItems } from '@/lib/menu-server';

// Menu edits in the admin show up immediately.
export const dynamic = 'force-dynamic';

// Without a table link the menu is browse-only; ordering happens from the QR code on the table.
export default async function Home() {
  return <DarkskyMenu items={await getMenuItems()} table={null} />;
}
