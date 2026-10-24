import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import LogoutButton from '@/components/admin/LogoutButton';

export const dynamic = 'force-dynamic';

const NAV = [['/admin', 'Меню'], ['/admin/content', 'Контент'], ['/admin/tables', 'Столы и QR'], ['/admin/stats', 'Статистика'], ['/admin/staff', 'Персонал'], ['/admin/access', 'Доступ'], ['/admin/orders', 'Заказы'], ['/admin/telegram', 'Telegram']];

export default async function Panel({ children }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="font-display tracking-[.14em]">DARKSKY</Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white">{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <a href="/staff" target="_blank" className="rounded-lg px-3 py-2 text-white/60 hover:text-white">Страница заказов ↗</a>
          <a href="/" target="_blank" className="rounded-lg px-3 py-2 text-white/60 hover:text-white">Открыть меню ↗</a>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
