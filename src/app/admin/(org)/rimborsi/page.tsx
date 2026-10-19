import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/RefundsPage';

export const metadata = { title: 'Rimborsi' };

export default async function Page() {
  const denied = await pageDenied('orders.read');
  if (denied) return denied;
  return <LegacyPage />;
}
