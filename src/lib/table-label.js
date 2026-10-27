// A table's own name as typed in the admin: trimmed, up to 24 characters, empty → none (the number is shown)
export const cleanLabel = v => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, 24) || null;

// two tables with the same name would be told apart by nobody
export async function labelTaken(sql, label, exceptId = null) {
  const [t] = await sql`select id from tables where lower(label) = lower(${label}) and id is distinct from ${exceptId}`;
  return !!t;
}
