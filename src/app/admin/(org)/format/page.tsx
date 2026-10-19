import { AdminPage } from '@/components/admin/shell/AdminPage';
import { pageDenied } from '@/server/auth/guard';
import { listSeries } from '@/server/domain/editions/series';
import { FormatsClient } from './FormatsClient';

export const metadata = { title: 'Format' };

export default async function FormatsPage() {
  const denied = await pageDenied('editions.edit');
  if (denied) return denied;
  return (
    <AdminPage>
      <FormatsClient rows={await listSeries()} />
    </AdminPage>
  );
}
