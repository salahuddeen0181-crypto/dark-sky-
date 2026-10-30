import Link from 'next/link';
import { db } from '@/lib/db';
import { fmtPrice } from '@/lib/money';
import AutoRefresh from '@/components/admin/AutoRefresh';
import { tableName } from '@/lib/table-name';

const STATUS = { new: ['Новый', 'bg-[#e8793c] text-black'], accepted: ['Принят', 'bg-white/15'], served: ['Подано', 'bg-white/5 text-white/60'], failed: ['Не доставлен в Telegram', 'border border-[#e8793c]/60 text-[#f2a676]'] };

const STEP = 50;

export default async function OrdersPage({ searchParams }) {
  const tz = process.env.VENUE_TIMEZONE || 'America/Argentina/Buenos_Aires';
  const limit = Math.min(1000, Math.max(STEP, Math.round(Number((await searchParams).n) || STEP)));
  // one extra row tells whether there is more
  const rows = await db()`select id, table_number, table_label, lines, total, cash, on_request, status, accepted_by, note, edited_at, extra_of, created_at
    from orders where archived_at is null order by created_at desc limit ${limit + 1}`;
  const orders = rows.slice(0, limit), more = rows.length > limit;
  const time = d => new Date(d).toLocaleString('ru-RU', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh seconds={15} />
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-lg uppercase tracking-[.08em]">Заказы</h1>
        <span className="text-xs text-white/40">последние {orders.length} · обновляется сам · «Изменить» — поправить заказ вручную</span>
      </div>
      {!orders.length && <div className="py-16 text-center text-white/50">Заказов пока нет</div>}
      <div className="flex flex-col gap-2">
        {orders.map(o => {
          const [label, cls] = STATUS[o.status] || [o.status, ''];
          return (
            <div key={o.id} className="grid gap-2 rounded-2xl border border-white/10 bg-[#0e0e13] p-4 sm:grid-cols-[110px_1fr_auto]">
              <div>
                <div className="font-display text-lg">{tableName(o)}</div>
                <div className="text-xs text-white/45">#{o.id} · {time(o.created_at)}{o.extra_of ? ` · дозаказ к #${o.extra_of}` : ''}</div>
              </div>
              <div className="text-sm text-white/80">
                {o.lines.map((l, i) => <div key={i}>{l.name}{l.variant ? ` — ${l.variant}` : ''} × {l.qty}</div>)}
                {o.note && <div className="mt-1 text-[#f6c3a3]">💬 {o.note}</div>}
                {o.edited_at && <div className="mt-1 text-xs text-white/45">изменён персоналом</div>}
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>
                <span className="font-semibold tabular-nums">{fmtPrice(o.total)}{o.on_request ? ' +' : ''}</span>
                {o.cash && <span className="text-xs text-[#f2a676]">наличные/крипто −15%</span>}
                {o.accepted_by && <span className="text-xs text-white/50">{o.accepted_by}</span>}
                <Link href={`/admin/orders/${o.id}`} className="mt-1 rounded-lg border border-white/15 px-3 py-1 text-xs text-white/75 hover:text-white">Изменить</Link>
              </div>
            </div>
          );
        })}
      </div>
      {more && <Link href={`/admin/orders?n=${limit + STEP}`} scroll={false} className="self-center rounded-xl border border-white/15 px-5 py-2 text-sm text-white/75 hover:text-white">Показать ещё {STEP}</Link>}
    </div>
  );
}
