import 'server-only';
// Costi dell'associazione: per edizione (editionId) o generali (null). Mai cancellati: si annullano (§18).
// Quelli di un'edizione si modificano finché l'edizione non è conclusa o archiviata.
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { COST_CATEGORIES, COST_PAYMENT_METHODS, costTotals, type CostTotals } from '@/lib/costs';
import { csvMoney, toCsv } from '@/lib/csv';
import { romeDateKey } from '@/lib/dates';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { costs, editions, inventoryItems } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { netByEdition } from '@/server/domain/stats';
import type { EditionStatus } from '@/server/domain/editions/types';

/** Dopo "Dichiara conclusa" il rendiconto (costi compresi) non si modifica più. */
export const COSTS_LOCKED_STATUSES: readonly EditionStatus[] = ['concluded', 'archived'];
export const costsLocked = (status: EditionStatus) => COSTS_LOCKED_STATUSES.includes(status);

const LOCKED_MESSAGE = 'L’edizione è conclusa: i costi sono in sola lettura.';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const DATE_KEY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.');

export const CostInput = z
  .object({
    spentOn: DATE_KEY,
    category: z.enum(COST_CATEGORIES, { message: 'Scegli una categoria.' }),
    description: z.string().trim().min(1, 'Scrivi una descrizione.').max(300),
    supplier: optionalText(200),
    amountCents: z.number().int().positive('L’importo deve essere maggiore di zero.').max(100_000_000),
    paymentMethod: z.enum(COST_PAYMENT_METHODS),
    paid: z.boolean(),
    paidAt: z
      .string()
      .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Data non valida.')
      .nullish()
      .transform((v) => v || null),
    attachmentUrl: z
      .url({ protocol: /^https$/, message: 'Allegato non valido.' })
      .nullish()
      .transform((v) => v || null),
    notes: optionalText(2000),
    inventoryItemId: z.uuid().nullish().transform((v) => v || null),
  })
  .transform((v) => ({ ...v, paidAt: v.paid ? (v.paidAt ?? v.spentOn) : null }));
export type CostInput = z.input<typeof CostInput>;

export type CostRow = typeof costs.$inferSelect & { inventoryItemName: string | null };

function assertCan(ctx: Ctx, permission: Permission, edition: string | null) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

/** Edizione bloccata per la scrittura dei costi, o null per i costi generali. */
async function editionForCosts(tx: Tx, slug: string | null) {
  if (!slug) return null;
  const [e] = await tx.select({ id: editions.id, slug: editions.slug, status: editions.status }).from(editions).where(eq(editions.slug, slug)).for('update');
  if (!e) throw new DomainError('NOT_FOUND');
  if (e.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
  if (costsLocked(e.status)) throw new DomainError('CONFLICT', { message: LOCKED_MESSAGE });
  return e;
}

async function editionIdOf(slug: string) {
  const [e] = await getDb().select({ id: editions.id }).from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  return e.id;
}

/** Voci di un'edizione (slug) o generali (null), annullate comprese, dalla più recente. */
export async function listCosts(ctx: Ctx, edition: string | null): Promise<CostRow[]> {
  assertCan(ctx, 'costs.read', edition);
  const editionId = edition ? await editionIdOf(edition) : null;
  const rows = await getDb()
    .select({ c: costs, inventoryItemName: inventoryItems.name })
    .from(costs)
    .leftJoin(inventoryItems, eq(inventoryItems.id, costs.inventoryItemId))
    .where(editionId ? eq(costs.editionId, editionId) : isNull(costs.editionId))
    .orderBy(desc(costs.spentOn), desc(costs.createdAt));
  return rows.map((r) => ({ ...r.c, inventoryItemName: r.inventoryItemName }));
}

/** Totali per categoria delle voci valide di un'edizione (per rendiconto e PDF). */
export async function editionCostTotals(editionId: string): Promise<CostTotals> {
  const rows = await getDb()
    .select({ category: costs.category, amountCents: costs.amountCents })
    .from(costs)
    .where(and(eq(costs.editionId, editionId), isNull(costs.voidedAt)));
  return costTotals(rows);
}

export async function createCost(ctx: Ctx, edition: string | null, input: CostInput): Promise<{ id: string }> {
  assertCan(ctx, 'costs.write', edition);
  const data = CostInput.parse(input);
  return withTransaction(async (tx) => {
    const e = await editionForCosts(tx, edition);
    const [row] = await tx
      .insert(costs)
      .values({ ...data, editionId: e?.id ?? null, createdBy: ctx.user?.id ?? null })
      .returning();
    await audit(tx, ctx, 'cost.created', { entityType: 'cost', entityId: row.id, edition, after: row });
    return { id: row.id };
  });
}

async function costForWrite(tx: Tx, ctx: Ctx, id: string) {
  const [row] = await tx
    .select({ c: costs, slug: editions.slug })
    .from(costs)
    .leftJoin(editions, eq(editions.id, costs.editionId))
    .where(eq(costs.id, id))
    .for('update', { of: costs });
  if (!row) throw new DomainError('NOT_FOUND');
  assertCan(ctx, 'costs.write', row.slug);
  if (row.c.voidedAt) throw new DomainError('CONFLICT', { message: 'Il costo è annullato e non si modifica più.' });
  await editionForCosts(tx, row.slug);
  return row;
}

export async function updateCost(ctx: Ctx, id: string, input: CostInput): Promise<void> {
  const data = CostInput.parse(input);
  await withTransaction(async (tx) => {
    const { c: before, slug } = await costForWrite(tx, ctx, id);
    const [after] = await tx
      .update(costs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(costs.id, id))
      .returning();
    await audit(tx, ctx, 'cost.updated', { entityType: 'cost', entityId: id, edition: slug, before, after });
  });
}

/** "Annulla costo": la voce resta, barrata, con il motivo. Non conta più nei totali. */
export async function voidCost(ctx: Ctx, id: string, reason: string): Promise<void> {
  const why = z.string().trim().min(3, 'Scrivi il motivo dell’annullamento.').max(300).parse(reason);
  await withTransaction(async (tx) => {
    const { c: before, slug } = await costForWrite(tx, ctx, id);
    await tx.update(costs).set({ voidedAt: new Date(), voidReason: why, updatedAt: new Date() }).where(eq(costs.id, id));
    await audit(tx, ctx, 'cost.voided', { entityType: 'cost', entityId: id, edition: slug, before: { amountCents: before.amountCents, description: before.description }, reason: why });
  });
}

// ─── Riepilogo annuale ─────────────────────────────────────────────────────

export type YearSummary = {
  year: number;
  editions: Array<{ slug: string; title: string; incomeCents: number; costCents: number }>;
  generalCostCents: number;
  incomeCents: number;
  costCents: number;
  balanceCents: number;
};

/**
 * Per anno: entrate e costi di ogni edizione, costi generali (per data di spesa) e saldo.
 * L'anno di un'edizione è il suo `year` (o quello della data di inizio).
 */
export async function yearlySummary(ctx: Ctx): Promise<YearSummary[]> {
  assertCan(ctx, 'costs.read', null);
  const db = getDb();
  const [eds, byEdition, general] = await Promise.all([
    db.select({ id: editions.id, slug: editions.slug, title: editions.title, year: editions.year, startsAt: editions.startsAt }).from(editions).orderBy(asc(editions.startsAt)),
    db
      .select({ id: costs.editionId, cents: sql<number>`coalesce(sum(${costs.amountCents}), 0)::int` })
      .from(costs)
      .where(and(isNotNull(costs.editionId), isNull(costs.voidedAt)))
      .groupBy(costs.editionId),
    db
      .select({ year: sql<number>`extract(year from ${costs.spentOn})::int`, cents: sql<number>`coalesce(sum(${costs.amountCents}), 0)::int` })
      .from(costs)
      .where(and(isNull(costs.editionId), isNull(costs.voidedAt)))
      .groupBy(sql`1`),
  ]);
  const income = await netByEdition(eds.map((e) => e.id));
  const years = new Map<number, YearSummary>();
  const yearOf = (year: number) => {
    let y = years.get(year);
    if (!y) years.set(year, (y = { year, editions: [], generalCostCents: 0, incomeCents: 0, costCents: 0, balanceCents: 0 }));
    return y;
  };
  for (const e of eds) {
    const incomeCents = income.get(e.id) ?? 0;
    const costCents = byEdition.find((c) => c.id === e.id)?.cents ?? 0;
    const year = e.year ?? (e.startsAt ? Number(romeDateKey(e.startsAt).slice(0, 4)) : null);
    if (year === null || (!incomeCents && !costCents)) continue;
    yearOf(year).editions.push({ slug: e.slug, title: e.title, incomeCents, costCents });
  }
  for (const g of general) yearOf(g.year).generalCostCents = g.cents;
  for (const y of years.values()) {
    y.incomeCents = y.editions.reduce((s, e) => s + e.incomeCents, 0);
    y.costCents = y.editions.reduce((s, e) => s + e.costCents, 0) + y.generalCostCents;
    y.balanceCents = y.incomeCents - y.costCents;
  }
  return [...years.values()].sort((a, b) => b.year - a.year);
}

// ─── CSV ───────────────────────────────────────────────────────────────────

const PAY: Record<string, string> = { cash: 'Contanti', bank_transfer: 'Bonifico', card: 'Carta', other: 'Altro' };

/** Elenco delle voci (annullate comprese, segnate) per Excel. */
export function costsCsv(rows: CostRow[]): string {
  return toCsv(
    ['Data', 'Categoria', 'Descrizione', 'Fornitore', 'Importo (€)', 'Pagamento', 'Pagato', 'Pagato il', 'Allegato', 'Materiale', 'Note', 'Annullato', 'Motivo annullamento'],
    rows.map((r) => [
      r.spentOn,
      r.category,
      r.description,
      r.supplier,
      csvMoney(r.amountCents),
      PAY[r.paymentMethod] ?? r.paymentMethod,
      r.paid,
      r.paidAt,
      r.attachmentUrl,
      r.inventoryItemName,
      r.notes,
      !!r.voidedAt,
      r.voidReason,
    ]),
  );
}

/** Riepilogo annuale per Excel: una riga per edizione, una per i costi generali, una di totale. */
export function yearlyCsv(years: YearSummary[]): string {
  const rows = years.flatMap((y) => [
    ...y.editions.map((e) => [y.year, e.title, csvMoney(e.incomeCents), csvMoney(e.costCents), csvMoney(e.incomeCents - e.costCents)]),
    [y.year, 'Costi generali', null, csvMoney(y.generalCostCents), csvMoney(-y.generalCostCents)],
    [y.year, 'Totale anno', csvMoney(y.incomeCents), csvMoney(y.costCents), csvMoney(y.balanceCents)],
  ]);
  return toCsv(['Anno', 'Voce', 'Entrate (€)', 'Costi (€)', 'Saldo (€)'], rows);
}

