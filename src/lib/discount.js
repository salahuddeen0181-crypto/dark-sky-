// Discount on a dish or on one of its variants. `p` is always what the guest pays (orders and staff read only p);
// `was` keeps the full price and `off` the percent, so the admin can change or drop the discount later.

const price = v => (v === null || v === '' || v === undefined ? null : Math.max(0, Math.round(Number(v)) || 0));

// full price + percent → { p, was?, off? }; 0 / empty / out of 1–90 → no discount
export function priced(full, rawOff) {
  const p = price(full), off = Math.round(Number(rawOff) || 0);
  if (p == null || !(off >= 1 && off <= 90)) return { p };
  return { p: Math.round(p * (1 - off / 100)), was: p, off };
}

const fullOf = x => x.was ?? x.p;
const reprice = (x, off) => { const { was, off: _old, ...rest } = x; return { ...rest, ...priced(fullOf(x), off) }; };

// off: one percent per variant (array) or for the whole dish (number)
export function withOff(data, off) {
  const at = i => (Array.isArray(off) ? off[i] : off);
  if (data.v?.length) { const v = data.v.map((x, i) => reprice(x, at(i))); return { ...data, v, p: v[0].p }; }
  return reprice(data, at(0));
}

export const fullPrice = fullOf;
export const maxOff = it => Math.max(it.off || 0, ...(it.v || []).map(v => v.off || 0));
