import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';
import LogoutButton from '@/components/admin/LogoutButton';

export const dynamic = 'force-dynamic';

const BTN = 'flex h-10 items-center justify-center whitespace-nowrap rounded-lg border border-white/15 px-3 text-white/70 hover:bg-white/10 hover:text-white max-sm:px-2 max-sm:text-[13px]';

export default async function Panel({ children }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex flex-col gap-3 border-b border-white/10 bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="font-display tracking-[.14em]">DARKSKY</Link>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-sm max-sm:w-full">
            <a href="/staff" target="_blank" className={BTN}>Страница заказов ↗</a>
            <a href="/" target="_blank" className={BTN}>Открыть меню ↗</a>
            <LogoutButton className={BTN} />
          </div>
        </div>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
