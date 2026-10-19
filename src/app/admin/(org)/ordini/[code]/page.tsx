import { OrderDetailPage } from '@/components/admin/orders/detail/OrderDetailPage';
import { getAdminCtx } from '@/server/auth/context';
import { editionsWith } from '@/server/auth/permissions';
import { ForbiddenState } from '@/components/ui';
import { AdminPage } from '@/components/admin/shell/AdminPage';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Ordine ${(await params).code.toUpperCase()}` };
}

/** Dettaglio dalla vista globale: il permesso sull'edizione dell'ordine lo controlla il servizio. */
export default async function Page({ params }: Props) {
  const ctx = await getAdminCtx();
  const scope = ctx ? editionsWith(ctx, 'orders.read') : [];
  if (scope !== 'all' && scope.length === 0) {
    return (
      <AdminPage>
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <ForbiddenState />
        </div>
      </AdminPage>
    );
  }
  return <OrderDetailPage code={(await params).code} edition={null} />;
}
