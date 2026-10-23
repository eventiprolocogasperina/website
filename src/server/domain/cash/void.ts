import 'server-only';
import { and, asc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { verifyPassword } from '@/server/auth/password';
import { can, MATRIX } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { cashSales, cashSessions, editions, payments, refundsV2, roleAssignments, ticketsV2, ordersV2, users } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockOrder } from '@/server/domain/orders/shared';
import { MAX_PIN_ATTEMPTS } from '@/server/domain/users';
import { assertCanOn } from './shared';

const VOID_ROLES = MATRIX['pos.void'];

/** Responsabili che possono autorizzare un annullo su questa edizione: ruolo con pos.void e un PIN. */
export async function listManagers(editionSlug: string): Promise<Array<{ id: string; name: string }>> {
  const rows = await getDb()
    .selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(roleAssignments, eq(roleAssignments.userId, users.id))
    .where(
      and(
        eq(users.active, true),
        isNull(users.pinLockedAt),
        isNotNull(users.pinHash),
        inArray(roleAssignments.role, [...VOID_ROLES]),
        or(isNull(roleAssignments.editionSlug), eq(roleAssignments.editionSlug, editionSlug)),
      ),
    )
    .orderBy(asc(users.name));
  return rows;
}

/**
 * Controlla il PIN del responsabile, in una transazione a parte: gli errori contano anche se poi
 * l'annullo non avviene (stesso blocco dopo 5 errori del PIN di entrata).
 */
async function verifyManagerPin(ctx: Ctx, editionSlug: string, userId: string, pin: string): Promise<{ id: string; name: string }> {
  return withTransaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!user || !user.active) throw new DomainError('FORBIDDEN', { message: 'Questa persona non può autorizzare annulli.' });
    if (user.pinLockedAt) throw new DomainError('FORBIDDEN', { message: 'Il PIN del responsabile è bloccato.' });
    const grants = await tx.select({ role: roleAssignments.role, edition: roleAssignments.editionSlug }).from(roleAssignments).where(eq(roleAssignments.userId, user.id));
    if (!can({ grants }, 'pos.void', { edition: editionSlug })) throw new DomainError('FORBIDDEN', { message: 'Questa persona non può autorizzare annulli.' });
    if (!verifyPassword(pin, user.pinHash ?? undefined)) {
      const attempts = user.pinFailedAttempts + 1;
      const locked = attempts >= MAX_PIN_ATTEMPTS;
      await tx.update(users).set({ pinFailedAttempts: attempts, pinLockedAt: locked ? new Date() : null }).where(eq(users.id, user.id));
      await audit(tx, ctx, locked ? 'auth.pin_locked' : 'auth.pin_failed', { entityType: 'user', entityId: user.id, edition: editionSlug, after: { tentativi: attempts, uso: 'annullo cassa' } });
      return { id: '', name: '' };
    }
    await tx.update(users).set({ pinFailedAttempts: 0 }).where(eq(users.id, user.id));
    return { id: user.id, name: user.name };
  }).then((r) => {
    if (!r.id) throw new DomainError('FORBIDDEN', { message: 'PIN del responsabile sbagliato.' });
    return r;
  });
}

export const VoidSaleInput = z.object({
  orderId: z.uuid(),
  reason: z.string().trim().min(3, 'Scrivi il motivo dell’annullo.').max(500),
  /** Responsabile che autorizza (pos.void) con il suo PIN. Dall'admin, chi ha pos.void può ometterlo. */
  managerUserId: z.uuid().nullish(),
  managerPin: z.string().regex(/^\d{4,6}$/, 'Il PIN ha da 4 a 6 cifre.').nullish(),
  /** Turno da cui escono i soldi (quello del telefono che annulla). Di default quello della vendita, se è ancora aperto. */
  cashSessionId: z.uuid().nullish(),
});

/**
 * Annullo di un contributo (§12.1): storno con lo stesso metodo del pagamento (rimborso già eseguito),
 * ordine annullato, biglietti non validi, scorte liberate, tutto nel registro. Nulla si cancella.
 */
export async function voidSale(ctx: Ctx, input: z.input<typeof VoidSaleInput>): Promise<{ refundedCents: number }> {
  const data = VoidSaleInput.parse(input);
  const [found] = await getDb().select({ editionId: cashSales.editionId }).from(cashSales).where(eq(cashSales.orderId, data.orderId));
  if (!found) throw new DomainError('NOT_FOUND', { message: 'Vendita di cassa non trovata.' });
  const [{ slug }] = await getDb().select({ slug: editions.slug }).from(editions).where(eq(editions.id, found.editionId));

  if (!can(ctx, 'pos.sell', { edition: slug }) && !can(ctx, 'pos.void', { edition: slug })) throw new DomainError('FORBIDDEN');
  if (ctx.device && ctx.device.edition !== slug) throw new DomainError('FORBIDDEN');
  let approver: { id: string | null; name: string };
  if (data.managerUserId && data.managerPin) approver = await verifyManagerPin(ctx, slug, data.managerUserId, data.managerPin);
  // Senza PIN: chi ha pos.void dall'admin, oppure un dispositivo a cui è stato concesso l'annullo.
  else if (can(ctx, 'pos.void', { edition: slug }) && (!ctx.device || ctx.permissions?.some((p) => p.permission === 'pos.void')))
    approver = ctx.device && !ctx.user ? { id: null, name: ctx.device.name } : { id: ctx.user?.id ?? null, name: ctx.user?.name ?? 'Amministratore' };
  else throw new DomainError('FORBIDDEN', { message: 'Serve il PIN di un responsabile.' });

  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, ctx.device ? 'pos.sell' : 'pos.void', edition.slug);
    const [sale] = await tx.select().from(cashSales).where(eq(cashSales.orderId, order.id)).for('update');
    if (sale.voidedAt || order.status === 'cancelled') throw new DomainError('CONFLICT', { message: 'Questa vendita è già stata annullata.' });

    // Turno da cui escono i soldi: quello indicato se aperto e della stessa edizione, altrimenti quello della vendita se aperto.
    const candidates = [data.cashSessionId, sale.cashSessionId].filter(Boolean) as string[];
    const open = candidates.length ? await tx.select().from(cashSessions).where(and(inArray(cashSessions.id, candidates), isNull(cashSessions.closedAt), eq(cashSessions.editionId, edition.id))) : [];
    const voidSession = open.find((s) => s.id === data.cashSessionId) ?? open.find((s) => s.id === sale.cashSessionId) ?? null;

    const [pay, ref] = await Promise.all([tx.select().from(payments).where(eq(payments.orderId, order.id)), tx.select().from(refundsV2).where(eq(refundsV2.orderId, order.id))]);
    const now = new Date();
    let refundedCents = 0;
    for (const method of ['cash', 'card_pos', 'complimentary'] as const) {
      const paid = pay.filter((p) => p.method === method && p.status === 'succeeded').reduce((s, p) => s + p.amountCents, 0);
      const back = ref.filter((r) => r.method === method && r.status === 'paid').reduce((s, r) => s + r.amountCents, 0);
      const amount = paid - back;
      if (amount <= 0) continue;
      await tx.insert(refundsV2).values({ orderId: order.id, amountCents: amount, reason: `Annullo in cassa: ${data.reason}`, method, status: 'paid', processedAt: now, processedBy: ctx.user?.id ?? null, cashSessionId: voidSession?.id ?? null });
      refundedCents += amount;
    }
    await tx.update(ordersV2).set({ status: 'cancelled', cancelledAt: now, updatedAt: now }).where(eq(ordersV2.id, order.id));
    await tx.update(ticketsV2).set({ status: 'void', updatedAt: now }).where(eq(ticketsV2.orderId, order.id));
    await tx
      .update(cashSales)
      .set({ voidedAt: now, voidedBy: ctx.user?.id ?? null, voidApprovedBy: approver.id, voidReason: data.reason, voidCashSessionId: voidSession?.id ?? null })
      .where(eq(cashSales.orderId, order.id));
    await audit(tx, ctx, 'cash.sale_voided', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { status: order.status },
      after: { status: 'cancelled', code: order.code, number: sale.number, refundedCents, approvedBy: approver.name },
      reason: data.reason,
    });
    events.push({ type: 'order.cancelled', orderId: order.id, code: order.code, edition: edition.slug });
    return { refundedCents };
  });
  await publish(events);
  return result;
}
