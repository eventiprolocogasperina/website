import 'server-only';
import { and, desc, eq, or } from 'drizzle-orm';
import { csvMoney, toCsv } from '@/lib/cash/csv';
import { addDaysToKey, formatDate, romeDateTime } from '@/lib/dates';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { cashRegisters, cashSales, editions, ordersV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { assertCanOn, loadCashData } from './shared';
import { cashTotals, dayOf, groupMovements, type CashTotals, type GroupTotal } from './totals';

export type FlaggedSale = { orderId: string; code: string; number: number | null; register: string; at: string; totalCents: number; oversold: boolean; afterClose: boolean };

export type CashReport = {
  edition: { slug: string; title: string };
  period: { from: string | null; to: string | null };
  totals: CashTotals;
  byDay: GroupTotal[];
  byRegister: GroupTotal[];
  byOperator: GroupTotal[];
  flagged: FlaggedSale[];
};

export type ReportFilter = { from?: string | null; to?: string | null };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Rendiconto della cassa dell'edizione (prompt 14): per giorno, cassa, operatore, metodo e prodotto.
 * Stessi movimenti della chiusura Z, quindi la somma delle Z quadra con il rendiconto.
 * Le date sono giorni in ora italiana (`to` compreso).
 */
export async function cashReport(ctx: Ctx, slug: string, filter: ReportFilter = {}): Promise<CashReport> {
  assertCanOn(ctx, 'reports.export', slug);
  const [edition] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!edition) throw new DomainError('NOT_FOUND');
  const from = filter.from && DAY.test(filter.from) ? filter.from : null;
  const to = filter.to && DAY.test(filter.to) ? filter.to : null;
  const data = await loadCashData(getDb(), {
    editionId: edition.id,
    from: from ? romeDateTime(from) : undefined,
    to: to ? romeDateTime(addDaysToKey(to, 1)) : undefined,
  });

  const flaggedRows = await getDb()
    .select({ s: cashSales, o: ordersV2, register: cashRegisters.name })
    .from(cashSales)
    .innerJoin(ordersV2, eq(ordersV2.id, cashSales.orderId))
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSales.registerId))
    .where(and(eq(cashSales.editionId, edition.id), or(eq(cashSales.oversold, true), eq(cashSales.afterClose, true))))
    .orderBy(desc(ordersV2.createdAt))
    .limit(200);

  return {
    edition: { slug: edition.slug, title: edition.title },
    period: { from, to },
    totals: cashTotals(data.movements, data.lines, data.sales),
    byDay: groupMovements(data.movements, dayOf, (k) => formatDate(romeDateTime(k), 'short')),
    byRegister: groupMovements(data.movements, (m) => m.registerName),
    byOperator: groupMovements(data.movements, (m) => m.operatorName),
    flagged: flaggedRows.map(({ s, o, register }) => ({
      orderId: o.id,
      code: o.code,
      number: s.number,
      register,
      at: (s.offlineAt ?? o.createdAt).toISOString(),
      totalCents: o.totalCents,
      oversold: s.oversold,
      afterClose: s.afterClose,
    })),
  };
}

/** CSV del rendiconto: una sezione per dimensione, importi in euro con la virgola. */
export function reportCsv(r: CashReport): string {
  const rows: Array<Array<string | number>> = [];
  const groups: Array<[string, GroupTotal[]]> = [
    ['Giorno', r.byDay],
    ['Cassa', r.byRegister],
    ['Operatore', r.byOperator],
  ];
  for (const [dim, list] of groups) {
    for (const g of list) rows.push([dim, g.label, g.sales, csvMoney(g.cashCents), csvMoney(g.cardCents), csvMoney(g.netCents), csvMoney(g.complimentaryCents)]);
  }
  for (const m of r.totals.byMethod) rows.push(['Metodo', m.label, m.count, '', '', csvMoney(m.method === 'complimentary' ? 0 : m.netCents), csvMoney(m.method === 'complimentary' ? m.netCents : 0)]);
  for (const p of r.totals.products) rows.push(['Prodotto', p.name, p.quantity, '', '', csvMoney(p.amountCents), '']);
  rows.push(['Totale', r.edition.title, r.totals.sales, '', '', csvMoney(r.totals.netCents), csvMoney(r.totals.complimentaryCents)]);
  return toCsv(['Dimensione', 'Voce', 'Contributi (n.) / Quantità', 'Contanti €', 'Carta €', 'Totale contributi €', 'Omaggi (valore) €'], rows);
}
