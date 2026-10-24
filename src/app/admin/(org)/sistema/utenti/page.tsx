import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { listDeviceRegisters, listDevices } from '@/server/domain/devices';
import { listAssignableEditions } from '@/server/domain/editions';
import { listUsers } from '@/server/domain/users';
import { UsersClient } from './UsersClient';

export const metadata = { title: 'Utenti' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const denied = await pageDenied(['users.manage', 'settings.manage']);
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const canUsers = can(ctx, 'users.manage');
  const canDevices = can(ctx, 'settings.manage');
  const [users, devices, editions] = await Promise.all([
    canUsers ? listUsers(ctx) : Promise.resolve([]),
    canDevices ? listDevices(ctx) : Promise.resolve([]),
    listAssignableEditions(),
  ]);
  const registersByEdition = canDevices ? await listDeviceRegisters(ctx, [...new Set([...editions.map((e) => e.slug), ...devices.map((d) => d.edition)])]) : {};
  const { vista } = await searchParams;
  return (
    <AdminPage>
      <PageHeader title="Utenti" subtitle="Chi può entrare nell’admin, con quali ruoli, e i dispositivi da campo per cassa e scanner." />
      <UsersClient
        users={users}
        devices={devices}
        editions={editions}
        registersByEdition={registersByEdition}
        canUsers={canUsers}
        canDevices={canDevices}
        currentUserId={ctx.user?.id ?? null}
        initialTab={vista === 'dispositivi' || !canUsers ? 'dispositivi' : 'persone'}
      />
    </AdminPage>
  );
}
