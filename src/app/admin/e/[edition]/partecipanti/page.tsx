import { AttendeesList } from '@/components/admin/orders/AttendeesList';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { LoadError } from '@/components/admin/orders/LoadError';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { orderEditionContext } from '@/server/domain/orders/admin-context';
import { ATTENDEES_PAGE_SIZE, listAttendees, type AttendeeFilters } from '@/server/domain/orders/attendees';
import { log } from '@/server/log';

export const metadata = { title: 'Partecipanti' };

type Props = { params: Promise<{ edition: string }>; searchParams: Promise<Record<string, string | undefined>> };
const UUID = /^[0-9a-f-]{36}$/i;

/** Partecipanti dell'edizione (prompt 12). La pagina di prima resta su /admin/prenotazioni finché il flag orders_v2 è spento. */
export default async function Page({ params, searchParams }: Props) {
  const { edition } = await params;
  const denied = await pageDenied('orders.read', { edition });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const sp = await searchParams;
  const filters: AttendeeFilters = {
    q: (sp.q ?? '').trim().slice(0, 100),
    session: sp.sessione && UUID.test(sp.sessione) ? sp.sessione : '',
    checkin: sp.ingresso === 'in' || sp.ingresso === 'out' ? sp.ingresso : '',
    page: Math.max(0, (Number.parseInt(sp.pagina ?? '1', 10) || 1) - 1),
  };
  const data = await Promise.all([listAttendees(ctx, edition, filters), orderEditionContext(ctx, edition)]).catch((error) => {
    log.error('Partecipanti non caricati', { error });
    return null;
  });
  if (!data) return <LoadError title="Partecipanti" what="i partecipanti" />;
  const [{ rows, total }, context] = data;
  return (
    <AdminPage wide>
      <PageHeader title="Partecipanti" count={total} subtitle={`${context.edition.title} · un biglietto per riga`} />
      <AttendeesList rows={rows} total={total} page={filters.page} pageSize={ATTENDEES_PAGE_SIZE} filters={filters} sessions={context.sessions} base={`/admin/e/${edition}`} canRevert={!context.edition.readOnly && can(ctx, 'checkin.revert', { edition })} />
    </AdminPage>
  );
}
