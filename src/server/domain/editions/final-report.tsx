import 'server-only';
// Rendiconto finale (§9): CSV e PDF degli aggregati dell'edizione, salvati in edition_reports.
import { renderToBuffer } from '@react-pdf/renderer';
import { and, desc, eq } from 'drizzle-orm';
import { formatDate, formatDateTime } from '@/lib/dates';
import { balanceCents, type CostTotals } from '@/lib/costs';
import { csvMoney } from '@/lib/csv';
import { formatMoney } from '@/lib/money';
import { FinalReportDocument, type FinalReportData } from '@/lib/pdf/FinalReportPdf';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { editionReports, editions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { editionCostTotals } from '@/server/domain/costs';
import { editionMaterials, type EditionMaterial } from '@/server/domain/inventory';
import { DomainError } from '@/server/domain/errors';
import { editionStats, type EditionStats } from '@/server/domain/stats';
import { channelLabel, methodLabel, statsCsv } from '@/server/domain/stats/csv';
import { editionForWrite } from './index';
import { EDITION_STATUS_LABELS } from './types';

type Edition = typeof editions.$inferSelect;

/** Costi e materiale usato, accanto alle entrate nel rendiconto. */
export type ReportExtras = { costs: CostTotals; materials: EditionMaterial[] };

export function reportData(e: Edition, stats: EditionStats, now: Date, by: string | null, extras: ReportExtras = { costs: { byCategory: [], totalCents: 0 }, materials: [] }): FinalReportData {
  const t = stats.totals;
  const c = extras.costs;
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return {
    editionTitle: e.title,
    period: e.startsAt ? (e.endsAt && formatDate(e.endsAt) !== formatDate(e.startsAt) ? `${formatDate(e.startsAt)} – ${formatDate(e.endsAt)}` : formatDate(e.startsAt)) : null,
    status: EDITION_STATUS_LABELS[e.status],
    generatedAt: formatDateTime(now),
    generatedBy: by,
    totals: [
      { label: 'Entrate (incasso netto)', value: formatMoney(t.netCents) },
      { label: 'Costi', value: formatMoney(c.totalCents) },
      { label: 'Saldo', value: formatMoney(balanceCents(t.netCents, c.totalCents)) },
      { label: 'Incasso lordo', value: formatMoney(t.grossCents) },
      { label: 'Rimborsi pagati', value: formatMoney(t.refundedCents) },
      { label: 'Ordini', value: String(t.orders) },
      { label: 'Biglietti', value: String(t.tickets) },
      { label: 'Ingressi registrati', value: String(t.checkins) },
    ],
    tables: [
      { title: 'Costi per categoria', head: ['Categoria', 'Importo'], rows: c.byCategory.map((x) => [x.category, formatMoney(x.cents)]) },
      {
        title: 'Materiale usato',
        head: ['Materiale', 'Usciti', 'Rientrati', 'Mancanti'],
        rows: extras.materials.map((m) => [m.itemName, `${m.quantity} ${m.unit}`, m.returnedAt ? `${m.returnedQuantity ?? 0} ${m.unit}` : 'non ancora', m.missing ? `${m.missing} ${m.unit}` : '—']),
      },
      { title: 'Per canale', head: ['Canale', 'Ordini', 'Importo'], rows: stats.byChannel.map((c) => [channelLabel(c.channel), c.orders, formatMoney(c.cents)]) },
      { title: 'Per metodo di pagamento', head: ['Metodo', 'Importo'], rows: stats.byMethod.map((m) => [methodLabel(m.method), formatMoney(m.cents)]) },
      { title: 'Per prodotto', head: ['Prodotto', 'Quantità', 'Importo'], rows: stats.byProduct.map((p) => [p.name, p.quantity, formatMoney(p.cents)]) },
      {
        title: 'Per data',
        head: ['Data', 'Capienza', 'Venduti', 'Ingressi'],
        rows: stats.bySession.map((s) => [`${s.label} · ${formatDateTime(s.startsAt)}`, s.capacity ?? '—', s.sold, s.checkins]),
      },
      { title: 'Cassa per reparto', head: ['Reparto', 'Pezzi', 'Importo'], rows: stats.cashByDepartment.map((d) => [d.department, d.quantity, formatMoney(d.cents)]) },
      { title: 'Cassa per ora', head: ['Ora', 'Scontrini', 'Importo'], rows: stats.cashByHour.map((h) => [hh(h.hour), h.orders, formatMoney(h.cents)]) },
    ],
  };
}

/** CSV del rendiconto: le statistiche, poi costi, saldo e materiale (stesse 4 colonne). */
export function reportCsv(stats: EditionStats, { costs, materials }: ReportExtras): string {
  return statsCsv(stats, [
    ...costs.byCategory.map((x) => ['Costi', x.category, null, csvMoney(x.cents)]),
    ['Costi', 'Totale costi', null, csvMoney(costs.totalCents)],
    ['Saldo', 'Entrate meno costi', null, csvMoney(balanceCents(stats.totals.netCents, costs.totalCents))],
    ...materials.map((m) => ['Materiale usato', `${m.itemName} (${m.unit})`, m.quantity, null]),
    ...materials.filter((m) => m.missing).map((m) => ['Materiale mancante', `${m.itemName} (${m.unit})`, m.missing, null]),
  ]);
}

/** "Genera rendiconto finale": a edizione conclusa. Ogni generazione resta (la più recente vale). */
export async function generateFinalReport(ctx: Ctx, slug: string): Promise<{ id: string }> {
  if (!can(ctx, 'editions.edit', { edition: slug })) throw new DomainError('FORBIDDEN');
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  if (e.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
  if (e.status !== 'concluded') throw new DomainError('CONFLICT', { message: 'Il rendiconto finale si genera a edizione conclusa.' });
  const [stats, costs, materials] = await Promise.all([editionStats(e.id), editionCostTotals(e.id), editionMaterials(ctx, slug)]);
  const now = new Date();
  const pdf = await renderToBuffer(<FinalReportDocument r={reportData(e, stats, now, ctx.user?.name ?? null, { costs, materials })} />);
  const t = stats.totals;
  return withTransaction(async (tx) => {
    await editionForWrite(tx, slug);
    const [row] = await tx
      .insert(editionReports)
      .values({
        editionId: e.id,
        summary: { orders: t.orders, tickets: t.tickets, grossCents: t.grossCents, refundedCents: t.refundedCents, netCents: t.netCents, checkins: t.checkins, costCents: costs.totalCents, balanceCents: balanceCents(t.netCents, costs.totalCents) },
        csv: reportCsv(stats, { costs, materials }),
        pdfBase64: Buffer.from(pdf).toString('base64'),
        createdBy: ctx.user?.id ?? null,
      })
      .returning({ id: editionReports.id });
    await audit(tx, ctx, 'edition.final_report_generated', { entityType: 'edition', entityId: e.id, edition: slug, after: { reportId: row.id, netCents: t.netCents } });
    return row;
  });
}

/** Il rendiconto più recente, per il download dall'admin. */
export async function latestFinalReport(ctx: Ctx, slug: string) {
  if (!can(ctx, 'orders.read', { edition: slug })) throw new DomainError('FORBIDDEN');
  const [row] = await getDb()
    .select({ id: editionReports.id, csv: editionReports.csv, pdfBase64: editionReports.pdfBase64, createdAt: editionReports.createdAt })
    .from(editionReports)
    .innerJoin(editions, eq(editions.id, editionReports.editionId))
    .where(and(eq(editions.slug, slug)))
    .orderBy(desc(editionReports.createdAt))
    .limit(1);
  return row ?? null;
}
