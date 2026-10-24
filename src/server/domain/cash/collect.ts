import 'server-only';
import { and, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import type { Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { cashRegisters, cashSales, cashSessions, customers, editions, orderLines, ordersV2, payments, products, refundsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockOrder } from '@/server/domain/orders/shared';
import { applyPayment, summarizePayments } from '@/server/domain/payments';
import { formatMoney } from '@/lib/money';
import { assertCanOn, assertDeviceRegister, type Db } from './shared';

// Incasso degli ordini "Paga in loco" (bozze confermate con pay_on_site: in attesa, senza scadenza)
// in cassa o al varco. L'importo lo calcola il server da totale, pagamenti e rimborsi (§18.1): il
// browser manda solo quello che ha mostrato, e se non torna si risponde PRICE_CHANGED. L'incasso è un
// pagamento sul turno di cassa con la sua riga in cash_sales, così entra nella Z e nel rendiconto come
// le altre vendite (e si annulla con lo stesso annullo); l'ordine diventa pagato con recordPayment.

/** Da dove si incassa: la cassa (pos.sell) o il varco (permesso a parte, checkin.collect_payment). */
export type CollectVia = 'cassa' | 'varco';
const VIA_PERMISSION: Record<CollectVia, Permission> = { cassa: 'pos.sell', varco: 'checkin.collect_payment' };

/** `own`: aperto da questo dispositivo. */
export type OpenShift = { cashSessionId: string; register: string; own: boolean };

/** Quanto manca da pagare, dai pagamenti e rimborsi registrati. */
async function dueOf(db: Db, order: { id: string; totalCents: number }): Promise<number> {
  const [pay, ref] = await Promise.all([db.select().from(payments).where(eq(payments.orderId, order.id)), db.select().from(refundsV2).where(eq(refundsV2.orderId, order.id))]);
  return summarizePayments(order.totalCents, pay, ref).dueCents;
}

/** Turni aperti dell'edizione, quello aperto da questo dispositivo per primo. */
async function openShifts(db: Db, ctx: Ctx, editionId: string): Promise<OpenShift[]> {
  const rows = await db
    .select({ cashSessionId: cashSessions.id, register: cashRegisters.name, deviceId: cashSessions.deviceId, registerId: cashSessions.registerId })
    .from(cashSessions)
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .where(and(eq(cashSessions.editionId, editionId), isNull(cashSessions.closedAt)))
    .orderBy(desc(cashSessions.openedAt));
  const allowed = rows.filter((r) => !ctx.device?.registerId || r.registerId === ctx.device.registerId);
  const own = allowed.filter((r) => ctx.device && r.deviceId === ctx.device.id);
  return [...own, ...allowed.filter((r) => !own.includes(r))].map(({ cashSessionId, register }) => ({ cashSessionId, register, own: own.some((o) => o.cashSessionId === cashSessionId) }));
}

const NO_SHIFT = 'Nessun turno di cassa aperto: apri un turno dall’app Cassa, oppure manda la persona a pagare in cassa.';

export type CollectQuote = { orderId: string; code: string; dueCents: number; shifts: OpenShift[]; problem: string | null };

/** Cosa mostra il popup d'incasso del varco: importo dal server e turni aperti su cui incassare. */
export async function collectQuote(ctx: Ctx, orderId: string, via: CollectVia): Promise<CollectQuote> {
  const id = z.uuid().parse(orderId);
  const db = getDb();
  const [row] = await db.select({ o: ordersV2, slug: editions.slug }).from(ordersV2).innerJoin(editions, eq(editions.id, ordersV2.editionId)).where(and(eq(ordersV2.id, id), isNull(ordersV2.deletedAt)));
  if (!row) throw new DomainError('NOT_FOUND');
  assertCanOn(ctx, via === 'varco' ? 'checkin.scan' : 'pos.sell', row.slug);
  if (ctx.device && ctx.device.edition !== row.slug) throw new DomainError('FORBIDDEN');
  const base = { orderId: row.o.id, code: row.o.code, dueCents: await dueOf(db, row.o) };
  if (row.o.status !== 'pending' || !row.o.payOnSite) return { ...base, shifts: [], problem: row.o.status === 'paid' ? 'L’ordine è già pagato.' : 'Questo ordine non è da pagare in loco.' };
  try {
    assertCanOn(ctx, VIA_PERMISSION[via], row.slug);
  } catch {
    return { ...base, shifts: [], problem: 'Da pagare in cassa: questo dispositivo non può incassare.' };
  }
  const shifts = await openShifts(db, ctx, row.o.editionId);
  return { ...base, shifts, problem: shifts.length ? null : NO_SHIFT };
}

export const CollectInput = z.object({
  orderId: z.uuid(),
  /** Turno su cui incassare. In cassa è quello in corso; al varco si può omettere se ce n'è uno solo (o del dispositivo). */
  cashSessionId: z.uuid().nullish(),
  method: z.enum(['cash', 'card_pos']),
  /** Contante ricevuto, per il resto. Senza: importo esatto. */
  cashReceivedCents: z.number().int().min(0).max(1_000_000).nullish(),
  /** Generata dal telefono a ogni apertura: un reinvio non incassa due volte. */
  idempotencyKey: z.string().trim().min(8).max(100),
  /** Importo mostrato sul telefono: se il server calcola altro, PRICE_CHANGED. */
  expectedDueCents: z.number().int().min(0),
});
export type CollectInput = z.input<typeof CollectInput>;

export type CollectResult = { orderId: string; code: string; amountCents: number; method: 'cash' | 'card_pos'; changeCents: number | null; register: string; duplicate: boolean };

async function shiftFor(tx: Tx, ctx: Ctx, editionId: string, wanted: string | null | undefined) {
  if (!wanted) {
    const shifts = await openShifts(tx, ctx, editionId);
    if (!shifts.length) throw new DomainError('CONFLICT', { message: NO_SHIFT });
    if (shifts.length > 1 && !shifts[0].own) throw new DomainError('VALIDATION', { message: 'Ci sono più casse aperte: scegli su quale turno incassare.' });
    wanted = shifts[0].cashSessionId;
  }
  const [s] = await tx
    .select({ id: cashSessions.id, editionId: cashSessions.editionId, registerId: cashSessions.registerId, closedAt: cashSessions.closedAt, register: cashRegisters.name })
    .from(cashSessions)
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .where(eq(cashSessions.id, wanted))
    .for('share', { of: cashSessions });
  if (!s || s.editionId !== editionId) throw new DomainError('VALIDATION', { message: 'Il turno non è di questa edizione.' });
  if (s.closedAt) throw new DomainError('CONFLICT', { message: 'Il turno è stato chiuso. Apri un nuovo turno per incassare.' });
  assertDeviceRegister(ctx, s.registerId);
  return s;
}

/**
 * Incassa un ordine "Paga in loco": pagamento per quanto manca (calcolato qui) sul turno di cassa,
 * riga in cash_sales (Z e rendiconto), ordine pagato con recordPayment, voce nel registro.
 * Idempotente sulla chiave del telefono.
 */
export async function collectPayOnSite(ctx: Ctx, input: CollectInput, opts: { via: CollectVia; now?: Date }): Promise<CollectResult> {
  const data = CollectInput.parse(input);
  const now = opts.now ?? new Date();
  const providerRef = `onsite:${data.idempotencyKey}`;
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx): Promise<CollectResult> => {
    const locked = await lockOrder(tx, data.orderId);
    const { order, edition } = locked;
    assertCanOn(ctx, VIA_PERMISSION[opts.via], edition.slug);
    if (ctx.device && ctx.device.edition !== edition.slug) throw new DomainError('FORBIDDEN');

    const [again] = await tx.select().from(payments).where(eq(payments.providerRef, providerRef));
    if (again) {
      if (again.orderId !== order.id) throw new DomainError('CONFLICT', { message: 'Questa chiave è già stata usata per un altro ordine.' });
      const [sale] = await tx.select({ s: cashSales, register: cashRegisters.name }).from(cashSales).innerJoin(cashRegisters, eq(cashRegisters.id, cashSales.registerId)).where(eq(cashSales.orderId, order.id));
      return { orderId: order.id, code: order.code, amountCents: again.amountCents, method: again.method as 'cash' | 'card_pos', changeCents: sale?.s.changeCents ?? null, register: sale?.register ?? '', duplicate: true };
    }
    if (order.status === 'paid' || order.status === 'partially_refunded') throw new DomainError('CONFLICT', { message: 'L’ordine è già pagato.' });
    if (order.status !== 'pending' || !order.payOnSite) throw new DomainError('CONFLICT', { message: 'Questo ordine non è da pagare in loco.' });
    if (order.isBlacklisted) throw new DomainError('CONFLICT', { message: 'Ordine bloccato: chiama un responsabile.' });

    const shift = await shiftFor(tx, ctx, edition.id, data.cashSessionId);
    const due = await dueOf(tx, order);
    if (due <= 0) throw new DomainError('CONFLICT', { message: 'Non c’è niente da incassare su questo ordine.' });
    if (data.expectedDueCents !== due) throw new DomainError('PRICE_CHANGED', { message: `L’importo da pagare è cambiato: ora è ${formatMoney(due)}.` });
    let received: number | null = null;
    let change: number | null = null;
    if (data.method === 'cash') {
      received = data.cashReceivedCents ?? due;
      if (received < due) throw new DomainError('VALIDATION', { message: 'Il contante ricevuto è meno del dovuto.' });
      change = received - due;
    }
    const [already] = await tx.select({ orderId: cashSales.orderId }).from(cashSales).where(eq(cashSales.orderId, order.id));
    if (already) throw new DomainError('CONFLICT', { message: 'L’ordine risulta già incassato in cassa.' });

    await tx.insert(cashSales).values({ orderId: order.id, editionId: edition.id, cashSessionId: shift.id, registerId: shift.registerId, number: null, cashReceivedCents: received, changeCents: change });
    const paid = await applyPayment(tx, ctx, locked, { orderId: order.id, method: data.method, amountCents: due, status: 'succeeded', providerRef, raw: null, cashSessionId: shift.id }, now, events);
    if (paid.orderStatus !== 'paid') throw new DomainError('CONFLICT', { message: 'L’ordine non risulta pagato dopo l’incasso. Chiama un responsabile.' });
    await audit(tx, ctx, 'order.collected_on_site', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { status: order.status },
      after: { status: 'paid', via: opts.via, register: shift.register, method: data.method, amountCents: due, paymentId: paid.paymentId },
    });
    return { orderId: order.id, code: order.code, amountCents: due, method: data.method, changeCents: change, register: shift.register, duplicate: false };
  });
  await publish(events);
  return result;
}

export type PayOnSiteOrder = { orderId: string; code: string; name: string | null; totalCents: number; dueCents: number; summary: string };

/**
 * "Da incassare" in cassa: ordini "Paga in loco" in attesa dell'edizione, per codice o nome del
 * cliente. Solo nome e codice, niente email né telefono.
 */
export async function searchPayOnSite(ctx: Ctx, editionSlug: string, query: string): Promise<PayOnSiteOrder[]> {
  assertCanOn(ctx, 'pos.sell', editionSlug);
  if (ctx.device && ctx.device.edition !== editionSlug) throw new DomainError('FORBIDDEN');
  const q = z.string().trim().max(80).parse(query).replace(/[%_\\]/g, '');
  const db = getDb();
  const [edition] = await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, editionSlug));
  if (!edition) throw new DomainError('NOT_FOUND');
  const rows = await db
    .select({ o: ordersV2, name: customers.name })
    .from(ordersV2)
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .where(
      and(
        eq(ordersV2.editionId, edition.id),
        eq(ordersV2.status, 'pending'),
        eq(ordersV2.payOnSite, true),
        isNull(ordersV2.deletedAt),
        q ? or(ilike(ordersV2.code, `%${q}%`), ilike(customers.name, `%${q}%`)) : undefined,
      ),
    )
    .orderBy(desc(ordersV2.createdAt))
    .limit(20);
  const ids = rows.map((r) => r.o.id);
  if (!ids.length) return [];
  const [lines, pay, ref] = await Promise.all([
    db.select({ orderId: orderLines.orderId, name: products.name, quantity: orderLines.quantity }).from(orderLines).innerJoin(products, eq(products.id, orderLines.productId)).where(inArray(orderLines.orderId, ids)),
    db.select().from(payments).where(inArray(payments.orderId, ids)),
    db.select().from(refundsV2).where(inArray(refundsV2.orderId, ids)),
  ]);
  return rows.map(({ o, name }) => ({
    orderId: o.id,
    code: o.code,
    name,
    totalCents: o.totalCents,
    dueCents: summarizePayments(o.totalCents, pay.filter((p) => p.orderId === o.id), ref.filter((r) => r.orderId === o.id)).dueCents,
    summary: lines
      .filter((l) => l.orderId === o.id)
      .map((l) => `${l.quantity}× ${l.name}`)
      .join(', '),
  }));
}
