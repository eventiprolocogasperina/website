import { AdminPage } from '@/components/admin/shell/AdminPage';
import { pageDenied } from '@/server/auth/guard';
import { getSettings } from '@/server/domain/settings';
import { GeneralSettingsClient } from './GeneralSettingsClient';

export const metadata = { title: 'Impostazioni' };

/** Sistema → Impostazioni (§10.3): dati dell'associazione, social, SEO, argomenti di supporto. Sostituisce /admin/impostazioni. */
export default async function SettingsPage() {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  const [general, legacyNotice] = await Promise.all([getSettings('general'), getSettings('legacy_notice')]);
  return (
    <AdminPage>
      <GeneralSettingsClient initial={{ general, legacy_notice: legacyNotice }} />
    </AdminPage>
  );
}
