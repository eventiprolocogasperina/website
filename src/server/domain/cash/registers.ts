import 'server-only';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction } from '@/server/db/client';
import { cashCounters, cashRegisters, cashSessions, products, type RegisterPrinterSettings } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { editionForWrite } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';
import { isUniqueViolation } from '@/server/domain/orders/shared';
import { assertCanOn, type RegisterRow } from './shared';

/** Le stesse impostazioni di oggi (CashierPrinterSettings): la stampa ESC/POS non cambia. */
export const DEFAULT_PRINTER: RegisterPrinterSettings = {
  ticketWidthMm: 58,
  charactersPerLine: 32,
  autoPrintOnOrder: false,
  printCustomerReceipt: true,
  printDepartmentSlips: true,
  headerTitle: 'PRO LOCO GASPERINA APS',
  footerText: 'Grazie per il tuo contributo!',
  showQrCode: false,
  autoCutPaper: true,
};

export const PrinterSettingsInput = z.object({
  ticketWidthMm: z.number().int().min(40, 'Almeno 40 mm.').max(120, 'Al massimo 120 mm.'),
  charactersPerLine: z.number().int().min(16).max(64),
  autoPrintOnOrder: z.boolean(),
  printCustomerReceipt: z.boolean(),
  printDepartmentSlips: z.boolean(),
  headerTitle: z.string().trim().max(48).optional(),
  footerText: z.string().trim().max(96).optional(),
  showQrCode: z.boolean(),
  autoCutPaper: z.boolean(),
});

export const printerOf = (r: Pick<RegisterRow, 'printerSettings'>): RegisterPrinterSettings => ({ ...DEFAULT_PRINTER, ...(r.printerSettings ?? {}) });

export async function listRegisters(editionId: string, opts: { activeOnly?: boolean } = {}): Promise<RegisterRow[]> {
  return getDb()
    .select()
    .from(cashRegisters)
    .where(and(eq(cashRegisters.editionId, editionId), opts.activeOnly ? eq(cashRegisters.active, true) : undefined))
    .orderBy(asc(cashRegisters.sort), asc(cashRegisters.name));
}

export const RegisterInput = z.object({
  name: z.string().trim().min(2, 'Dai un nome alla cassa, es. “Cassa 1”.').max(40),
  issuesNumbers: z.boolean(),
  active: z.boolean(),
  /** null = tutti i prodotti con il canale cassa. */
  productIds: z.array(z.uuid()).max(500).nullable(),
  printerSettings: PrinterSettingsInput.nullable().optional(),
});
export type RegisterInput = z.input<typeof RegisterInput>;

/** Crea o modifica una cassa (permesso catalog.edit, come il catalogo). */
export async function saveRegister(ctx: Ctx, slug: string, id: string | null, input: RegisterInput): Promise<{ id: string }> {
  assertCanOn(ctx, 'catalog.edit', slug);
  const data = RegisterInput.parse(input);
  try {
    return await withTransaction(async (tx) => {
      const edition = await editionForWrite(tx, slug);
      if (data.productIds?.length) {
        const own = await tx.select({ id: products.id }).from(products).where(eq(products.editionId, edition.id));
        if (data.productIds.some((p) => !own.some((o) => o.id === p))) throw new DomainError('VALIDATION', { message: 'Uno dei prodotti non è di questa edizione.' });
      }
      const values = {
        name: data.name,
        issuesNumbers: data.issuesNumbers,
        active: data.active,
        productIds: data.productIds,
        ...(data.printerSettings !== undefined ? { printerSettings: data.printerSettings } : {}),
        updatedAt: new Date(),
      };
      if (id) {
        const [before] = await tx.select().from(cashRegisters).where(and(eq(cashRegisters.id, id), eq(cashRegisters.editionId, edition.id))).for('update');
        if (!before) throw new DomainError('NOT_FOUND');
        await tx.update(cashRegisters).set(values).where(eq(cashRegisters.id, id));
        await audit(tx, ctx, 'cash.register_updated', { entityType: 'cash_register', entityId: id, edition: slug, before: { ...before, printerSettings: undefined }, after: values });
        return { id };
      }
      const [{ n }] = await tx.select({ n: sql<number>`coalesce(max(${cashRegisters.sort}), 0)::int` }).from(cashRegisters).where(eq(cashRegisters.editionId, edition.id));
      const [row] = await tx
        .insert(cashRegisters)
        .values({ ...values, editionId: edition.id, printerSettings: data.printerSettings ?? DEFAULT_PRINTER, sort: n + 1 })
        .returning({ id: cashRegisters.id });
      await audit(tx, ctx, 'cash.register_created', { entityType: 'cash_register', entityId: row.id, edition: slug, after: values });
      return { id: row.id };
    });
  } catch (error) {
    if (isUniqueViolation(error, 'cash_registers_edition_name_unique')) throw new DomainError('CONFLICT', { message: 'Esiste già una cassa con questo nome.' });
    throw error;
  }
}

/** Una cassa con un turno aperto non si spegne: prima va chiuso il turno. */
export async function setRegisterActive(ctx: Ctx, slug: string, id: string, active: boolean): Promise<void> {
  assertCanOn(ctx, 'catalog.edit', slug);
  await withTransaction(async (tx) => {
    const edition = await editionForWrite(tx, slug);
    const [reg] = await tx.select().from(cashRegisters).where(and(eq(cashRegisters.id, id), eq(cashRegisters.editionId, edition.id))).for('update');
    if (!reg) throw new DomainError('NOT_FOUND');
    if (!active) {
      const [open] = await tx.select({ id: cashSessions.id }).from(cashSessions).where(and(eq(cashSessions.registerId, id), isNull(cashSessions.closedAt)));
      if (open) throw new DomainError('CONFLICT', { message: 'La cassa ha un turno aperto: chiudilo prima di spegnerla.' });
    }
    await tx.update(cashRegisters).set({ active, updatedAt: new Date() }).where(eq(cashRegisters.id, id));
    await audit(tx, ctx, active ? 'cash.register_enabled' : 'cash.register_disabled', { entityType: 'cash_register', entityId: id, edition: slug, after: { name: reg.name } });
  });
}

/**
 * Fa ripartire il numero da chiamare (es. nuova giornata): il prossimo ordine avrà `startFrom`.
 * Sostituisce "azzeramento" del rendiconto di oggi: nessun ordine viene cancellato.
 */
export async function resetOrderNumbering(ctx: Ctx, slug: string, startFrom: number): Promise<void> {
  assertCanOn(ctx, 'catalog.edit', slug);
  const start = z.number().int().min(1, 'Il numero deve essere almeno 1.').max(99_999).parse(startFrom);
  await withTransaction(async (tx) => {
    const edition = await editionForWrite(tx, slug);
    await tx
      .insert(cashCounters)
      .values({ editionId: edition.id, kind: 'order_number', value: start - 1 })
      .onConflictDoUpdate({ target: [cashCounters.editionId, cashCounters.kind], set: { value: start - 1, updatedAt: new Date() } });
    await audit(tx, ctx, 'cash.numbering_reset', { entityType: 'edition', entityId: edition.id, edition: slug, after: { nextNumber: start } });
  });
}

/** Il prossimo numero da chiamare (per l'admin). */
export async function nextOrderNumber(editionId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: cashCounters.value })
    .from(cashCounters)
    .where(and(eq(cashCounters.editionId, editionId), eq(cashCounters.kind, 'order_number')));
  return (row?.value ?? 0) + 1;
}
