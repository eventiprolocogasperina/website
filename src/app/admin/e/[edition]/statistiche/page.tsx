import { BarChart3, Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { BarList, ColumnChart } from '@/components/admin/stats/Charts';
import { ButtonLink, Card, EmptyState, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { editionStats, editionTotals, previousEdition, type Totals } from '@/server/domain/stats';
import { channelLabel, methodLabel } from '@/server/domain/stats/csv';

export const metadata = { title: 'Statistiche' };

const hours = (rows: Array<{ hour: number; cents: number; orders: number }>) => {
  if (!rows.length) return [];
  const from = Math.min(...rows.map((r) => r.hour));
  const to = Math.max(...rows.map((r) => r.hour));
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const r = rows.find((x) => x.hour === from + i);
    return { label: String(from + i).padStart(2, '0'), value: r?.cents ?? 0, hint: `${r?.orders ?? 0} ordini` };
  });
};

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-border text-left text-label text-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={i === 0 ? 'px-4 py-2 font-medium' : 'px-4 py-2 text-right font-medium'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? 'px-4 py-2 text-fg' : 'px-4 py-2 text-right tabular-nums'}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function diff(now: number, before: number, money = false) {
  const d = now - before;
  const pct = before ? ` (${d >= 0 ? '+' : ''}${Math.round((d / before) * 100)}%)` : '';
  return `${d >= 0 ? '+' : '−'}${money ? formatMoney(Math.abs(d)) : Math.abs(d)}${pct}`;
}

/** Statistiche dell'edizione (§10.3): canale, prodotto, data, giorno e ora; cassa; confronto; esportazione. */
export default async function StatsPage(props: EditionParams) {
  const edition = await editionFromParams(props);
  const denied = await pageDenied('orders.read', { edition: edition.slug });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const [stats, prev] = await Promise.all([editionStats(edition.id), previousEdition(edition.id)]);
  const prevTotals: Totals | null = prev ? await editionTotals(prev.id) : null;
  const t = stats.totals;
  const canExport = can(ctx, 'reports.export', { edition: edition.slug });

  return (
    <AdminPage>
      <PageHeader
        title="Statistiche"
        subtitle={edition.title}
        badge={<StatusBadge status={edition.status} />}
        secondaryActions={
          canExport ? (
            <ButtonLink href={`/admin/e/${edition.slug}/statistiche/esporta`} variant="secondary" icon={Download}>
              Esporta CSV
            </ButtonLink>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Incassato netto" value={formatMoney(t.netCents)} help={`lordo ${formatMoney(t.grossCents)}`} />
        <Stat label="Ordini" value={t.orders} help={`${t.tickets} biglietti`} />
        <Stat label="Rimborsi pagati" value={formatMoney(t.refundedCents)} />
        <Stat label="Ingressi registrati" value={t.checkins} />
      </div>

      {t.orders === 0 ? (
        <EmptyState icon={BarChart3} title="Nessuna vendita ancora" description="I numeri compaiono appena arriva il primo ordine pagato, online o in cassa." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Per canale">
              <BarList rows={stats.byChannel.map((c) => ({ label: channelLabel(c.channel), value: c.cents, sub: `${c.orders} ordini` }))} format={formatMoney} />
            </Card>
            <Card title="Per metodo di pagamento">
              <BarList rows={stats.byMethod.map((m) => ({ label: methodLabel(m.method), value: m.cents }))} format={formatMoney} />
            </Card>
          </div>
          <Card title="Per giorno" description="Incassato per giorno di vendita">
            <ColumnChart data={stats.byDay.map((d) => ({ label: d.day.slice(5).split('-').reverse().join('/'), value: d.cents, hint: `${d.orders} ordini` }))} format={formatMoney} />
          </Card>
          <Card title="Per ora del giorno" description="Quando si compra, tutti i canali">
            <ColumnChart data={hours(stats.byHour)} format={formatMoney} height="h-32" />
          </Card>
          <Card title="Per prodotto" flush>
            <Table head={['Prodotto', 'Quantità', 'Importo']} rows={stats.byProduct.map((p) => [p.name, p.quantity, formatMoney(p.cents)])} />
          </Card>
          {stats.bySession.length > 0 && (
            <Card title="Per data" flush>
              <Table
                head={['Data', 'Capienza', 'Venduti', 'Entrati', 'Liberi']}
                rows={stats.bySession.map((s) => [
                  <span key="l">
                    {s.label}
                    <span className="block text-label text-muted">{formatDateTime(s.startsAt)}</span>
                  </span>,
                  s.capacity ?? '—',
                  s.sold,
                  s.checkins,
                  s.remaining ?? '—',
                ])}
              />
            </Card>
          )}
          {(stats.cashByHour.length > 0 || stats.cashByDepartment.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Cassa per ora">
                <ColumnChart data={hours(stats.cashByHour)} format={formatMoney} height="h-32" />
              </Card>
              <Card title="Cassa per reparto">
                <BarList rows={stats.cashByDepartment.map((d) => ({ label: d.department, value: d.cents, sub: `${d.quantity} pezzi` }))} format={formatMoney} />
              </Card>
            </div>
          )}
        </>
      )}

      <Card title="Confronto con l’edizione precedente" description={prev ? prev.title : undefined} flush>
        {prev && prevTotals ? (
          <Table
            head={['', edition.title, prev.title, 'Differenza']}
            rows={[
              ['Incassato netto', formatMoney(t.netCents), formatMoney(prevTotals.netCents), diff(t.netCents, prevTotals.netCents, true)],
              ['Ordini', t.orders, prevTotals.orders, diff(t.orders, prevTotals.orders)],
              ['Biglietti', t.tickets, prevTotals.tickets, diff(t.tickets, prevTotals.tickets)],
              ['Ingressi', t.checkins, prevTotals.checkins, diff(t.checkins, prevTotals.checkins)],
            ]}
          />
        ) : (
          <p className="px-4 pb-4 text-body text-muted">Nessuna edizione precedente dello stesso format con una data di inizio.</p>
        )}
      </Card>
    </AdminPage>
  );
}
