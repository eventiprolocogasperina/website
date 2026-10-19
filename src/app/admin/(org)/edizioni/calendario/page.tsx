import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/EventsPage';

export const metadata = { title: 'Schede del calendario' };

/** Le schede di `events` che il sito pubblico mostra ancora nel calendario, fino al prompt 17. */
export default async function Page() {
  const denied = await pageDenied('editions.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
