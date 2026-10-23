import 'server-only';
import { db } from './db';

// Waiters and their shifts. A waiter is a Telegram account: it registers by opening the staff Mini App or writing
// /start to the bot, and works only after the admin approves it. Needs the database.
export const staffReady = () => !!process.env.DATABASE_URL;
const MAX_SHIFT_H = 14;

// MARK: - Waiters
// Telegram user → staff row (created as 'pending' on first contact); keeps name/username fresh while pending.
export async function registerTg(u) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').slice(0, 60) || u.username || 'Официант';
  const [s] = await db()`
    insert into staff (tg_id, name, username, last_seen_at) values (${u.id}, ${name}, ${u.username || null}, now())
    on conflict (tg_id) do update set username = excluded.username, last_seen_at = now(),
      name = case when staff.status = 'pending' then excluded.name else staff.name end
    returning *`;
  return s;
}

export async function getStaffById(id) {
  const [s] = await db()`select * from staff where id = ${id}`;
  return s || null;
}
export async function getStaffByTg(tgId) {
  const [s] = await db()`select * from staff where tg_id = ${tgId}`;
  return s || null;
}

export async function listStaff() {
  await closeStale();
  return db()`
    select s.*, sh.started_at as shift_started
    from staff s left join shifts sh on sh.staff_id = s.id and sh.ended_at is null
    order by case s.status when 'pending' then 0 when 'active' then 1 else 2 end, s.name`;
}

// { status?, name? } from the admin
export async function updateStaff(id, { status, name }) {
  const sql = db();
  if (status && !['pending', 'active', 'blocked'].includes(status)) throw new Error('bad status');
  const [s] = await sql`
    update staff set status = coalesce(${status || null}, status), name = coalesce(${name ? String(name).trim().slice(0, 60) : null}, name)
    where id = ${id} returning *`;
  if (s && s.status === 'blocked') await sql`update shifts set ended_at = now() where staff_id = ${id} and ended_at is null`;
  return s || null;
}

// MARK: - Shifts
// A shift forgotten open ends 14 h after it started (marked auto_closed, so the hours can be checked)
export async function closeStale() {
  if (!staffReady()) return;
  await db()`update shifts set ended_at = started_at + make_interval(hours => ${MAX_SHIFT_H}), auto_closed = true
    where ended_at is null and started_at < now() - make_interval(hours => ${MAX_SHIFT_H})`;
}

export async function openShift(staffId) {
  await closeStale();
  const [s] = await db()`select * from shifts where staff_id = ${staffId} and ended_at is null`;
  return s || null;
}

export async function startShift(staffId) {
  const open = await openShift(staffId);
  if (open) return open;
  const [s] = await db()`insert into shifts (staff_id) values (${staffId}) on conflict do nothing returning *`;
  return s || openShift(staffId);
}

export async function endShift(staffId) {
  const [s] = await db()`update shifts set ended_at = now() where staff_id = ${staffId} and ended_at is null returning *`;
  return s || null;
}

// Active waiters on shift right now, earliest first
export async function onShift() {
  if (!staffReady()) return [];
  await closeStale();
  return db()`select s.id, s.name, sh.started_at from shifts sh join staff s on s.id = sh.staff_id
    where sh.ended_at is null and s.status = 'active' order by sh.started_at`;
}

export async function shiftsSince(date) {
  if (!staffReady()) return [];
  await closeStale();
  return db()`select sh.*, s.name from shifts sh join staff s on s.id = sh.staff_id
    where coalesce(sh.ended_at, now()) >= ${date} order by sh.started_at desc`;
}
