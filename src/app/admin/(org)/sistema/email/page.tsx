import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/EmailPreviewPage';

export const metadata = { title: 'Email' };

export default async function Page() {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  return <LegacyPage />;
}
