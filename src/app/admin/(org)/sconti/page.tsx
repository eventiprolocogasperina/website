import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/DiscountsPage';

export const metadata = { title: 'Sconti' };

export default async function Page() {
  const denied = await pageDenied('catalog.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
