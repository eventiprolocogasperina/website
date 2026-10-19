import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/SettingsPage';

export const metadata = { title: 'Impostazioni' };

export default async function Page() {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  return <LegacyPage />;
}
