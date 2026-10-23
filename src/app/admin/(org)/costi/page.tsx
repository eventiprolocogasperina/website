import { Download } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { CostsManager } from '@/components/admin/costs/CostsManager';
import { ButtonLink, Card, PageHeader } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { listCosts, yearlySummary } from '@/server/domain/costs';
import { listItems } from '@/server/domain/inventory';

export const metadata = { title: 'Costi generali' };

const money = (c: number) => <span className="tabular-nums">{formatMoney(c)}</span>;

/** Costi dell'associazione non legati a un'edizione e riepilogo per anno di entrate, costi e saldo. */
export default async function GeneralCostsPage() {
  const denied = await pageDenied('costs.read');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const [rows, years, items] = await Promise.all([listCosts(ctx, null), yearlySummary(ctx), can(ctx, 'inventory.read') ? listItems(ctx) : Promise.resolve([])]);

  return (
    <AdminPage>
      <PageHeader
        title="Costi generali"
        subtitle="Spese dell’associazione fuori dalle edizioni (assicurazioni, sede, materiale) e il riepilogo di ogni anno."
        secondaryActions={
          <>
            <ButtonLink href="/admin/costi/esporta?tipo=riepilogo" variant="secondary" icon={Download}>
              Riepilogo CSV
            </ButtonLink>
            <ButtonLink href="/admin/costi/esporta" variant="secondary" icon={Download}>
              Costi CSV
            </ButtonLink>
          </>
        }
      />
      {years.map((y) => (
        <Card key={y.year} title={`Anno ${y.year}`} description={`Saldo ${formatMoney(y.balanceCents)}`} flush>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border text-left text-label text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">Voce</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Entrate</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Costi</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {y.editions.map((e) => (
                  <tr key={e.slug}>
                    <td className="px-4 py-2">
                      <Link href={`/admin/e/${e.slug}/costi`} className="text-primary hover:underline">
                        {e.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">{money(e.incomeCents)}</td>
                    <td className="px-4 py-2 text-right">{money(e.costCents)}</td>
                    <td className="px-4 py-2 text-right">{money(e.incomeCents - e.costCents)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 text-fg">Costi generali</td>
                  <td className="px-4 py-2 text-right text-muted">—</td>
                  <td className="px-4 py-2 text-right">{money(y.generalCostCents)}</td>
                  <td className="px-4 py-2 text-right">{money(-y.generalCostCents)}</td>
                </tr>
                <tr className="font-medium">
                  <td className="px-4 py-2 text-fg">Totale {y.year}</td>
                  <td className="px-4 py-2 text-right">{money(y.incomeCents)}</td>
                  <td className="px-4 py-2 text-right">{money(y.costCents)}</td>
                  <td className="px-4 py-2 text-right">{money(y.balanceCents)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      <CostsManager edition={null} rows={rows} canWrite={can(ctx, 'costs.write')} locked={false} items={items.map((i) => ({ id: i.id, name: i.name }))} />
    </AdminPage>
  );
}
