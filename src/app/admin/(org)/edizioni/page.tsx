import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/EventsPage';

export const metadata = { title: 'Edizioni' };

export default async function Page() {
  const denied = await pageDenied('editions.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
