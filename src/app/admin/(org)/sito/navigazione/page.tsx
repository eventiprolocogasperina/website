import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { getNavConfig } from '@/server/domain/site/navigation';
import { listPublicFormats } from '@/server/public/editions';
import { publicV2Enabled } from '@/server/public/flags';
import { NavigationClient } from './NavigationClient';

export const metadata = { title: 'Navigazione' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const [config, formats, enabled] = await Promise.all([getNavConfig(), listPublicFormats(), publicV2Enabled()]);
  return (
    <AdminPage>
      <NavigationClient initial={config} formats={formats} flag={{ enabled, canToggle: can(ctx, 'settings.manage') }} />
    </AdminPage>
  );
}
