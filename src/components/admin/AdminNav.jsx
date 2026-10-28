'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [['/admin', 'Меню'], ['/admin/content', 'Контент'], ['/admin/tables', 'Столы и QR'], ['/admin/stats', 'Статистика'], ['/admin/staff', 'Персонал'], ['/admin/access', 'Доступ'], ['/admin/orders', 'Заказы'], ['/admin/telegram', 'Telegram']];

// The admin sections as an even grid (4 per row on a phone, one row of 8 on a wide screen), the current one lit.
// A dish's editor counts as «Меню», an order's editor as «Заказы».
export default function AdminNav() {
  const path = usePathname();
  const on = href => (href === '/admin' ? path === '/admin' || path.startsWith('/admin/items') : path.startsWith(href));
  return (
    <nav className="grid grid-cols-4 gap-1 text-sm lg:grid-cols-8">
      {NAV.map(([href, label]) => (
        <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined}
          className={`flex h-10 items-center justify-center whitespace-nowrap rounded-lg px-1 text-center max-sm:text-[13px] ${on(href) ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>{label}</Link>
      ))}
    </nav>
  );
}
