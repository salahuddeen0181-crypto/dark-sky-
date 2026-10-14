import { db } from '@/lib/db';
import { siteUrl } from '@/lib/site';
import { tableUrl, qrSvg } from '@/lib/qr';
import TablesAdmin from '@/components/admin/TablesAdmin';

export default async function TablesPage() {
  const base = await siteUrl();
  const rows = await db()`
    select t.id, t.number, t.token, t.active, count(o.id)::int as orders
    from tables t left join orders o on o.table_id = t.id
    group by t.id order by t.number`;
  const tables = await Promise.all(rows.map(async t => ({ ...t, url: tableUrl(base, t.token), svg: await qrSvg(tableUrl(base, t.token)) })));
  return <TablesAdmin tables={tables} base={base} />;
}
