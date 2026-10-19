import 'server-only';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { LoadError } from '@/components/admin/orders/LoadError';
import { getAdminCtx } from '@/server/auth/context';
import { editionsWith } from '@/server/auth/permissions';
import { listRefunds, REFUND_STATUSES, REFUNDS_PAGE_SIZE, type RefundFilters, type RefundStatusKey } from '@/server/domain/refunds/admin';
import { log } from '@/server/log';
import { RefundQueue } from './RefundQueue';

type Search = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** Coda rimborsi, unica per /admin/rimborsi (tutte le edizioni) e /admin/e/[edition]/rimborsi. */
export async function RefundsPage({ edition, searchParams }: { edition: string | null; searchParams: Search }) {
  const ctx = (await getAdminCtx())!;
  const stato = first(searchParams.stato);
  const filters: RefundFilters = {
    // Senza parametro si apre sulle richieste da gestire.
    status: stato === 'tutti' ? '' : REFUND_STATUSES.includes(stato as RefundStatusKey) ? (stato as RefundStatusKey) : 'requested',
    q: first(searchParams.q).trim().slice(0, 100),
    page: Math.max(0, (Number.parseInt(first(searchParams.pagina), 10) || 1) - 1),
  };
  const base = edition ? `/admin/e/${edition}/rimborsi` : '/admin/rimborsi';
  const data = await listRefunds(ctx, edition, filters).catch((error) => {
    log.error('Coda rimborsi non caricata', { error });
    return null;
  });
  if (!data) return <LoadError title="Rimborsi" what="i rimborsi" />;
  const { rows, total, counts } = data;
  return (
    <AdminPage wide>
      <PageHeader title="Rimborsi" count={counts.requested + counts.approved} subtitle="Da gestire e da eseguire. Gli IBAN sono nascosti: aprili solo per fare il bonifico." />
      <RefundQueue
        rows={rows}
        total={total}
        counts={counts}
        filters={filters}
        pageSize={REFUNDS_PAGE_SIZE}
        perms={{ refund: editionsWith(ctx, 'orders.refund'), viewIban: editionsWith(ctx, 'refunds.view_iban') }}
        global={!edition}
        exportHref={`${base}/esporta`}
      />
    </AdminPage>
  );
}
