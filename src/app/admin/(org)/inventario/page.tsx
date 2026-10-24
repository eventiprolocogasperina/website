import { AdminPage } from '@/components/admin/shell/AdminPage';
import { InventoryClient } from '@/components/admin/inventory/InventoryClient';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can, canSomewhere } from '@/server/auth/permissions';
import { listEditions } from '@/server/domain/editions';
import { listItems } from '@/server/domain/inventory';

export const metadata = { title: 'Inventario' };

/** Materiale dell'associazione: dove si trova, in che stato, a quali eventi è andato. */
export default async function InventoryPage() {
  const ctx = await getAdminCtx();
  if (!ctx || !canSomewhere(ctx, 'inventory.read')) return pageDenied('inventory.read');
  const [items, editions] = await Promise.all([listItems(ctx), listEditions()]);
  return (
    <AdminPage>
      <InventoryClient
        items={items}
        canWrite={can(ctx, 'inventory.write')}
        editions={editions.filter((e) => e.status !== 'archived').map((e) => ({ id: e.id, title: e.title }))}
      />
    </AdminPage>
  );
}
