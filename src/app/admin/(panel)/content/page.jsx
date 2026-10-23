import { getContentForm } from '@/lib/content';
import ContentForm from '@/components/admin/content/ContentForm';

// /admin/content — home tiles, categories, promotions and house rules
export default async function ContentPage() {
  return <ContentForm initial={await getContentForm()} />;
}
