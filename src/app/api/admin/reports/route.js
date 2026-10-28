import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { currentDay, saveReport } from '@/lib/shift-report';

// POST { send } — the report of the current working day, made now (and sent to the owners' group when send)
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const { send } = await req.json().catch(() => ({}));
  const r = await saveReport(currentDay(), { send: !!send });
  return r ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'За эту смену заказов пока нет' }, { status: 400 });
}
