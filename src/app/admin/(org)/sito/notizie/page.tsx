import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/NewsPage';

export const metadata = { title: 'Notizie' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
