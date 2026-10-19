import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { checkinListOptions, checkinStats, listCheckinLists, scannerV2Enabled } from '@/server/domain/checkin';
import { listDevices } from '@/server/domain/devices';
import { editionFromParams } from '@/server/domain/editions/page-params';
import { CheckinClient, type CheckinTab } from './CheckinClient';

export const metadata = { title: 'Check-in' };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ edition: string }>; searchParams: Promise<{ giorno?: string; scheda?: string }> };

const TABS: CheckinTab[] = ['andamento', 'liste', 'dispositivi'];

export default async function CheckinPage({ params, searchParams }: Props) {
  const edition = await editionFromParams({ params });
  const denied = await pageDenied('checkin.scan', { edition: edition.slug });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const sp = await searchParams;
  const canDevices = can(ctx, 'settings.manage');
  const [stats, lists, options, devices, v2] = await Promise.all([
    checkinStats(ctx, edition.slug, { day: sp.giorno }),
    listCheckinLists(ctx, edition.slug),
    checkinListOptions(ctx, edition.slug),
    canDevices ? listDevices(ctx) : Promise.resolve([]),
    scannerV2Enabled(),
  ]);
  return (
    <AdminPage>
      <CheckinClient
        edition={{ slug: edition.slug, title: edition.title, readOnly: edition.status === 'archived' }}
        tab={TABS.includes(sp.scheda as CheckinTab) ? (sp.scheda as CheckinTab) : 'andamento'}
        stats={stats}
        lists={lists}
        options={options}
        devices={devices.filter((d) => d.edition === edition.slug && d.kind === 'scanner')}
        perms={{ lists: can(ctx, 'catalog.edit', { edition: edition.slug }), devices: canDevices }}
        scannerV2={v2}
      />
    </AdminPage>
  );
}
