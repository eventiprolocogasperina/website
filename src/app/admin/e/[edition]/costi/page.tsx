import { Download } from 'lucide-react';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { CostsManager } from '@/components/admin/costs/CostsManager';
import { MaterialsCard } from '@/components/admin/costs/MaterialsCard';
import { ButtonLink, Card, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { balanceCents, costTotals } from '@/lib/costs';
import { formatMoney } from '@/lib/money';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { costsLocked, listCosts } from '@/server/domain/costs';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { editionMaterials, listItems } from '@/server/domain/inventory';
import { editionTotals } from '@/server/domain/stats';

export const metadata = { title: 'Costi e rendiconto' };

/** Costi dell'edizione e rendiconto per il direttivo: entrate, costi per categoria, saldo, materiale usato. */
export default async function EditionCostsPage(props: EditionParams) {
  const edition = await editionFromParams(props);
  const denied = await pageDenied('costs.read', { edition: edition.slug });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const readsInventory = can(ctx, 'inventory.read', { edition: edition.slug });
  const [rows, income, materials, items] = await Promise.all([
    listCosts(ctx, edition.slug),
    editionTotals(edition.id),
    editionMaterials(ctx, edition.slug),
    readsInventory ? listItems(ctx) : Promise.resolve([]),
  ]);
  const totals = costTotals(rows);
  const saldo = balanceCents(income.netCents, totals.totalCents);
  const locked = costsLocked(edition.status);

  return (
    <AdminPage>
      <PageHeader
        title="Costi e rendiconto"
        subtitle={locked ? `${edition.title} · conclusa: sola lettura` : edition.title}
        badge={<StatusBadge status={edition.status} />}
        secondaryActions={
          <ButtonLink href={`/admin/e/${edition.slug}/costi/esporta`} variant="secondary" icon={Download}>
            Esporta CSV
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Entrate" value={formatMoney(income.netCents)} help="Incasso netto (contributi meno rimborsi)" />
        <Stat label="Costi" value={formatMoney(totals.totalCents)} help={`${rows.filter((r) => !r.voidedAt).length} voci`} />
        <Stat label="Saldo" value={formatMoney(saldo)} help="Entrate meno costi" />
      </div>
      {totals.byCategory.length > 0 && (
        <Card title="Costi per categoria" flush>
          <ul className="divide-y divide-border">
            {totals.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between px-4 py-2 text-body">
                <span className="text-fg">{c.category}</span>
                <span className="tabular-nums">{formatMoney(c.cents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <CostsManager edition={edition.slug} rows={rows} canWrite={can(ctx, 'costs.write', { edition: edition.slug })} locked={locked} items={items.map((i) => ({ id: i.id, name: i.name }))} />
      <MaterialsCard rows={materials} canWrite={can(ctx, 'inventory.write') && edition.status !== 'archived'} />
    </AdminPage>
  );
}
