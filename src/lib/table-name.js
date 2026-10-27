// A table as people read it: its own label from the admin (e.g. «VIP 1»), otherwise «Стол 24».
// Works for a table row ({ number, label }) and for an order ({ table_number, table_label }); word: «Стол», «Mesa»…
export const tableName = (t, word = 'Стол') => {
  const label = t?.label ?? t?.table_label, n = t?.number ?? t?.table_number;
  return label || `${word} ${n}`;
};
