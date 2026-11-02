import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '@/lib/auth';
import { translate } from '@/lib/translate';

const SOURCE = ['es', 'en', 'ru'], MAX_FIELDS = 12;
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// { fields: [{ key, value: { es, en, … } }] } → { values: { key: { lang: text } } }: every language, the filled ones as given
export async function POST(req) {
  const deny = await denyUnlessAdmin(); if (deny) return deny;
  const b = await req.json().catch(() => null);
  const fields = Array.isArray(b?.fields) ? b.fields.slice(0, MAX_FIELDS) : [];
  // written only in a language outside es / en / ru: passed as text in an unknown language, which the model handles
  const input = fields.flatMap(f => {
    const v = Object.fromEntries(Object.entries(f?.value || {}).filter(([, t]) => typeof t === 'string' && t.trim()).map(([k, t]) => [k, t.trim().slice(0, 700)]));
    const texts = Object.values(v);
    return texts.length ? [{ key: String(f.key), value: SOURCE.some(k => v[k]) ? v : texts[0] }] : [];
  });
  try { return NextResponse.json({ values: await translate(input, { strict: true }) }); }
  catch (e) {
    if (e.message === 'not_configured') return fail('Автоперевод не настроен: добавьте ключ в разделе «Доступ»');
    console.error('translate', e);
    return fail(/ 402/.test(e.message) ? 'На счёте DeepSeek нет денег: пополните баланс' : / 40[13]/.test(e.message) ? 'Сервис не принял ключ: проверьте его в разделе «Доступ»' : 'Сервис перевода не ответил. Попробуйте ещё раз', 502);
  }
}
