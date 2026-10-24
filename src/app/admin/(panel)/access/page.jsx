import { getAuth } from '@/lib/credentials';
import AccessForm from '@/components/admin/AccessForm';

// /admin/access — admin password and the bar tablet's PIN (waiters' PINs are on «Персонал»)
export default async function AccessPage() {
  const a = await getAuth();
  return <AccessForm db={!!process.env.DATABASE_URL} adminInDb={!!a.admin} tabletSet={!!(a.tablet || process.env.STAFF_PIN)} />;
}
