import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/SponsorsPage';

export const metadata = { title: 'Sponsor' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
