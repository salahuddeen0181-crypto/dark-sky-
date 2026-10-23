import StaffBoard from '@/components/staff/StaffBoard';

export const dynamic = 'force-dynamic';

// /staff — orders for waiters and the bar. Access is checked by its API calls (cookie or the Mini App's header).
export default function StaffPage() {
  return <StaffBoard />;
}
