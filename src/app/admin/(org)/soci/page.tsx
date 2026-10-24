import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/MembersPage';

export const metadata = { title: 'Soci' };

export default async function Page() {
  const denied = await pageDenied('members.manage');
  if (denied) return denied;
  return <LegacyPage />;
}
