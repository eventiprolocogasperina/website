import 'server-only';
// Rendiconto finale (§9): CSV e PDF degli aggregati dell'edizione, salvati in edition_reports.
import { renderToBuffer } from '@react-pdf/renderer';
import { and, desc, eq } from 'drizzle-orm';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { FinalReportDocument, type FinalReportData } from '@/lib/pdf/FinalReportPdf';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { editionReports, editions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { editionStats, type EditionStats } from '@/server/domain/stats';
import { channelLabel, methodLabel, statsCsv } from '@/server/domain/stats/csv';
import { editionForWrite } from './index';
import { EDITION_STATUS_LABELS } from './types';

type Edition = typeof editions.$inferSelect;

export function reportData(e: Edition, stats: EditionStats, now: Date, by: string | null): FinalReportData {
  const t = stats.totals;
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return {
    editionTitle: e.title,
    period: e.startsAt ? (e.endsAt && formatDate(e.endsAt) !== formatDate(e.startsAt) ? `${formatDate(e.startsAt)} – ${formatDate(e.endsAt)}` : formatDate(e.startsAt)) : null,
    status: EDITION_STATUS_LABELS[e.status],
    generatedAt: formatDateTime(now),
    generatedBy: by,
    totals: [
      { label: 'Incasso netto', value: formatMoney(t.netCents) },
      { label: 'Incasso lordo', value: formatMoney(t.grossCents) },
      { label: 'Rimborsi pagati', value: formatMoney(t.refundedCents) },
      { label: 'Ordini', value: String(t.orders) },
      { label: 'Biglietti', value: String(t.tickets) },
      { label: 'Ingressi registrati', value: String(t.checkins) },
    ],
    tables: [
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

/** "Genera rendiconto finale": a edizione conclusa. Ogni generazione resta (la più recente vale). */
export async function generateFinalReport(ctx: Ctx, slug: string): Promise<{ id: string }> {
  if (!can(ctx, 'editions.edit', { edition: slug })) throw new DomainError('FORBIDDEN');
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  if (e.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
  if (e.status !== 'concluded') throw new DomainError('CONFLICT', { message: 'Il rendiconto finale si genera a edizione conclusa.' });
  const stats = await editionStats(e.id);
  const now = new Date();
  const pdf = await renderToBuffer(<FinalReportDocument r={reportData(e, stats, now, ctx.user?.name ?? null)} />);
  const t = stats.totals;
  return withTransaction(async (tx) => {
    await editionForWrite(tx, slug);
    const [row] = await tx
      .insert(editionReports)
      .values({
        editionId: e.id,
        summary: { orders: t.orders, tickets: t.tickets, grossCents: t.grossCents, refundedCents: t.refundedCents, netCents: t.netCents, checkins: t.checkins },
        csv: statsCsv(stats),
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
