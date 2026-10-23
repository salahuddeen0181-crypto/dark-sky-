import { listStaff, shiftsSince, staffReady } from '@/lib/staff';
import StaffAdmin from '@/components/admin/StaffAdmin';

// /admin/staff — waiters (approve, rename, block), who is on shift, shift history for 30 days
export default async function StaffPage() {
  if (!staffReady()) return <div className="py-16 text-center text-white/50">Учёт персонала работает только с базой данных (DATABASE_URL)</div>;
  const [staff, shifts] = await Promise.all([listStaff(), shiftsSince(new Date(Date.now() - 30 * 864e5))]);
  return <StaffAdmin staff={JSON.parse(JSON.stringify(staff))} shifts={JSON.parse(JSON.stringify(shifts))} />;
}
