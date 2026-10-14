// $12.345 — the menu's price format (dots as thousands separators).
export const fmtPrice = n => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
