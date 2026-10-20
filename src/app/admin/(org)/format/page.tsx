import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { listSeries } from '@/server/domain/editions/series';
import { publicV2Enabled } from '@/server/domain/pages';
import { FormatsClient } from './FormatsClient';

export const metadata = { title: 'Format' };

export default async function FormatsPage() {
  const denied = await pageDenied('editions.edit');
  if (denied) return denied;
  const [rows, v2, ctx] = await Promise.all([listSeries(), publicV2Enabled(), getAdminCtx()]);
  return (
    <AdminPage>
      <FormatsClient rows={rows} publicV2={v2} canToggle={!!ctx && can(ctx, 'settings.manage')} />
    </AdminPage>
  );
}
