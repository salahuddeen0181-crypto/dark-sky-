import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/site';
import { tableUrl, qrSvg } from '@/lib/qr';
import PrintButton from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

// A4 sheet of table cards (3 × 4), white for printing.
export default async function PrintQr() {
  await requireAdmin();
  const base = await siteUrl();
  const rows = await db()`select number, label, token from tables where active order by number`;
  const cards = await Promise.all(rows.map(async t => ({ number: t.number, label: t.label, svg: await qrSvg(tableUrl(base, t.token)) })));
  return (
    <div className="min-h-screen bg-white text-black print:bg-white">
      <style>{`@page { size: A4; margin: 10mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print flex items-center gap-4 border-b p-4 text-sm">
        <PrintButton />
        <span className="text-black/60">{cards.length} столов · вырежьте по линиям</span>
      </div>
      <div className="mx-auto grid max-w-[190mm] grid-cols-3 gap-0">
        {cards.map(c => (
          <div key={c.number} className="flex flex-col items-center gap-[2mm] border border-dashed border-black/25 px-[4mm] py-[5mm] text-center [break-inside:avoid]" style={{ height: '68mm' }}>
            <div className="font-display text-[11pt] tracking-[.18em]">DARKSKY</div>
            <div className="h-[34mm] w-[34mm]" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className="font-display text-[13pt] tracking-[.06em]">{c.label || `MESA · ${c.number}`}</div>
            <div className="text-[7pt] leading-tight text-black/70">Escaneá para pedir · Scan to order<br />Сканируйте, чтобы заказать</div>
          </div>
        ))}
      </div>
    </div>
  );
}
