import { mailConfig, resetTokenValid } from '@/lib/credentials';
import ResetForm from './ResetForm';

export const dynamic = 'force-dynamic';

// /admin/reset — a forgotten admin password: a link to the owner's mail, then /admin/reset?t=… sets a new one
export default async function ResetPage({ searchParams }) {
  const t = String((await searchParams).t || '');
  const ready = !!process.env.DATABASE_URL && !!(await mailConfig());
  return <ResetForm token={t} ready={ready} valid={t ? await resetTokenValid(t) : false} />;
}
