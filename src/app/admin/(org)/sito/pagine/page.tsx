import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/AssociationPage';

export const metadata = { title: 'Pagine' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
