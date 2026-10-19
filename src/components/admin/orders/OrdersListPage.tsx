import 'server-only';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { LoadError } from './LoadError';
import { parseOrderFilters } from '@/lib/admin/order-filters';
import { ordersV2Enabled } from '@/server/admin/flags';
import { getAdminCtx } from '@/server/auth/context';
import { can, editionsWith } from '@/server/auth/permissions';
import { listEditions } from '@/server/domain/editions';
import { orderEditionContext } from '@/server/domain/orders/admin-context';
import { listOrders, orderViewCounts } from '@/server/domain/orders/admin-list';
import { listSavedViews } from '@/server/domain/views';
import { log } from '@/server/log';
import { NewOrderSheet } from './NewOrderSheet';
import { OrdersList } from './OrdersList';
import { OrdersV2Switch } from './OrdersV2Switch';

type Search = Record<string, string | string[] | undefined>;

/**
 * Pagina Ordini, unica per le due rotte (§10.2): `edition` null per /admin/ordini (tutte le edizioni
 * leggibili), lo slug per /admin/e/[edition]/ordini. Il permesso lo controlla la rotta.
 */
export async function OrdersListPage({ edition, searchParams }: { edition: string | null; searchParams: Search }) {
  const ctx = (await getAdminCtx())!;
  const filters = parseOrderFilters(searchParams);
  const base = edition ? `/admin/e/${edition}/ordini` : '/admin/ordini';
  const data = await Promise.all([
    listOrders(ctx, edition, filters),
    orderViewCounts(ctx, edition),
    listSavedViews(ctx, 'orders'),
    edition ? orderEditionContext(ctx, edition) : null,
    edition ? null : listEditions(),
    ordersV2Enabled(),
  ]).catch((error) => {
    log.error('Elenco ordini non caricato', { error });
    return null;
  });
  if (!data) return <LoadError title="Ordini" what="gli ordini" />;
  const [result, counts, savedViews, context, allEditions, flag] = data;
  const readable = editionsWith(ctx, 'orders.read');
  const editions = allEditions?.filter((e) => readable === 'all' || readable.includes(e.slug)).map((e) => ({ slug: e.slug, title: e.title })) ?? null;
  return (
    <AdminPage wide>
      <PageHeader
        title="Ordini"
        count={result.total}
        subtitle={context ? context.edition.title : 'Tutte le edizioni'}
        primaryAction={context?.can.create ? <NewOrderSheet context={context} detailBase={base} /> : undefined}
        secondaryActions={can(ctx, 'settings.manage') ? <OrdersV2Switch enabled={flag} /> : undefined}
      />
      <OrdersList
        result={result}
        filters={filters}
        counts={counts}
        savedViews={savedViews}
        canSaveViews={!!ctx.user}
        context={context}
        editions={editions}
        detailBase={base}
        exportHref={`${base}/esporta`}
      />
    </AdminPage>
  );
}
