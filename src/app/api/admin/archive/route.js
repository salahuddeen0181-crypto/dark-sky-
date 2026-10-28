import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { archiveAll, archivePreview, archives, restoreArchive } from '@/lib/order-store';

// GET — what would go now and the archives made so far; POST — archive everything (statistics from zero);
// DELETE { at } — bring that archive back.
export async function GET() {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const [pending, list] = await Promise.all([archivePreview(), archives()]);
  return NextResponse.json({ pending, archives: list });
}
export async function POST() {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  return NextResponse.json(await archiveAll());
}
export async function DELETE(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { at } = await req.json().catch(() => ({}));
  // a timestamp as archives() gave it (Postgres text, or a number without a database)
  const ok = typeof at === 'number' || (typeof at === 'string' && /^\d{4}-\d{2}-\d{2}[ T][\d:.]+([+-]\d{2}(:?\d{2})?|Z)?$/.test(at));
  if (!ok) return NextResponse.json({ error: 'bad archive' }, { status: 400 });
  await restoreArchive(at);
  return NextResponse.json({ ok: true });
}
