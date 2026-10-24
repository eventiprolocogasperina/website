import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { editions, orderLines, ordersV2, sessions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { isReadOnly } from '@/server/domain/editions/lifecycle';
import { DomainError, isDomainError } from '@/server/domain/errors';
import { moveSession } from '@/server/domain/orders';
import { requireModule } from '@/server/domain/orders/shared';
import { moduleSettings } from '../registry';

export const MoveAllInput = z.object({
  editionId: z.string().uuid(),
  fromSessionId: z.string().uuid(),
  toSessionId: z.string().uuid(),
  reason: z.string().trim().max(500).nullish(),
});

/**
 * "Sposta data" in blocco (es. pioggia): ogni ordine con posti nella data di partenza si sposta con
 * moveSession, che controlla la capienza, scrive la cronologia e pubblica l'evento per l'email.
 * Gli ordini che non entrano nella nuova data restano dove sono e tornano nell'esito.
 */
export async function moveAllOrders(ctx: Ctx, input: z.input<typeof MoveAllInput>): Promise<{ moved: string[]; failed: Array<{ code: string; error: string }> }> {
  const data = MoveAllInput.parse(input);
  const rows = await getDb()
    .selectDistinct({ id: ordersV2.id, code: ordersV2.code })
    .from(ordersV2)
    .innerJoin(orderLines, eq(orderLines.orderId, ordersV2.id))
    .where(
      and(
        eq(ordersV2.editionId, data.editionId),
        eq(orderLines.sessionId, data.fromSessionId),
        inArray(ordersV2.status, ['pending', 'paid', 'partially_refunded']),
        isNull(ordersV2.deletedAt),
      ),
    )
    .orderBy(ordersV2.code);
  const moved: string[] = [];
  const failed: Array<{ code: string; error: string }> = [];
  for (const o of rows) {
    try {
      const r = await moveSession(ctx, { orderId: o.id, fromSessionId: data.fromSessionId, toSessionId: data.toSessionId, reason: data.reason });
      if (r.moved) moved.push(o.code);
    } catch (error) {
      if (!isDomainError(error) || error.code === 'FORBIDDEN' || error.code === 'EDITION_ARCHIVED') throw error;
      failed.push({ code: o.code, error: error.message });
    }
  }
  return { moved, failed };
}

export const PostponeInput = z.object({
  editionId: z.string().uuid(),
  sessionId: z.string().uuid(),
  /** Data di recupero, già creata in Date. */
  toSessionId: z.string().uuid(),
  reason: z.string().trim().max(500).nullish(),
});

/**
 * Rinvio per maltempo in un passo: la data diventa "rinviata" e punta alla data di recupero, gli
 * ordini passano alla nuova data (con email, se attiva) e ognuno ricorda la data scelta all'acquisto.
 * Si può rilanciare: gli ordini già spostati non si muovono di nuovo.
 */
export async function postponeSession(ctx: Ctx, input: z.input<typeof PostponeInput>) {
  const data = PostponeInput.parse(input);
  if (data.sessionId === data.toSessionId) throw new DomainError('VALIDATION', { message: 'Scegli una data di recupero diversa.' });
  await withTransaction(async (tx) => {
    const [edition] = await tx.select().from(editions).where(eq(editions.id, data.editionId)).for('share');
    if (!edition) throw new DomainError('NOT_FOUND');
    if (!can(ctx, 'orders.edit', { edition: edition.slug })) throw new DomainError('FORBIDDEN');
    if (isReadOnly(edition.status)) throw new DomainError('EDITION_ARCHIVED');
    requireModule(edition, 'postponement');
    const rows = await tx
      .select()
      .from(sessions)
      .where(and(eq(sessions.editionId, edition.id), inArray(sessions.id, [data.sessionId, data.toSessionId])))
      .orderBy(sessions.id)
      .for('update');
    const from = rows.find((s) => s.id === data.sessionId);
    const to = rows.find((s) => s.id === data.toSessionId);
    if (!from || !to) throw new DomainError('VALIDATION', { message: 'Le date devono essere di questa edizione.' });
    if (to.status === 'cancelled' || to.status === 'postponed') throw new DomainError('VALIDATION', { message: 'La data di recupero è annullata o già rinviata.' });
    if (from.rescheduledToSessionId && from.rescheduledToSessionId !== to.id) throw new DomainError('CONFLICT', { message: 'Questa data è già rinviata a un’altra data.' });
    if (await reachable(tx, to.id, from.id)) throw new DomainError('VALIDATION', { message: 'La data di recupero non può essere una data rinviata a questa.' });
    const now = new Date();
    await tx.update(sessions).set({ status: 'postponed', rescheduledToSessionId: to.id, updatedAt: now }).where(eq(sessions.id, from.id));
    // Ogni ordine ricorda la data scelta all'acquisto (serve per il rimborso al secondo rinvio).
    await tx
      .update(ordersV2)
      .set({ originalSessionId: from.id, updatedAt: now })
      .where(and(eq(ordersV2.editionId, edition.id), eq(ordersV2.sessionId, from.id), isNull(ordersV2.originalSessionId)));
    await audit(tx, ctx, 'session.postponed', {
      entityType: 'session',
      entityId: from.id,
      edition: edition.slug,
      before: { status: from.status },
      after: { status: 'postponed', recupero: to.label },
      reason: data.reason ?? null,
    });
  });
  return moveAllOrders(ctx, { editionId: data.editionId, fromSessionId: data.sessionId, toSessionId: data.toSessionId, reason: data.reason ?? 'Rinvio per maltempo' });
}

/** true se da `start`, seguendo i rinvii, si arriva a `target`. */
async function reachable(tx: Tx, start: string, target: string): Promise<boolean> {
  let id: string | null = start;
  for (let i = 0; id && i < 20; i++) {
    if (id === target) return true;
    const [row] = await tx.select({ next: sessions.rescheduledToSessionId }).from(sessions).where(eq(sessions.id, id));
    id = row?.next ?? null;
  }
  return false;
}

/**
 * Diritto al rimborso per rinvio (regolamento di Zuccaland): la data scelta all'acquisto è stata
 * rinviata e anche la sua data di recupero è stata rinviata. Conta i passaggi seguendo i rinvii.
 */
export async function postponementRefundRight(orderId: string): Promise<{ eligible: boolean; postponements: number; reason: string }> {
  const db = getDb();
  const [o] = await db
    .select({ start: ordersV2.originalSessionId, current: ordersV2.sessionId, settings: editions.moduleSettings, modules: editions.enabledModules })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .where(eq(ordersV2.id, orderId));
  if (!o) throw new DomainError('NOT_FOUND');
  if (!o.modules.includes('postponement')) return { eligible: false, postponements: 0, reason: 'Il rinvio per maltempo non è attivo per questa edizione.' };
  let postponements = 0;
  for (let id = o.start ?? o.current, i = 0; id && i < 20; i++) {
    const [s] = await db.select({ status: sessions.status, next: sessions.rescheduledToSessionId }).from(sessions).where(eq(sessions.id, id));
    if (s?.status !== 'postponed') break;
    postponements++;
    id = s.next;
  }
  const enabled = (moduleSettings('postponement', o.settings) as { refundOnSecondPostponement: boolean }).refundOnSecondPostponement;
  if (postponements >= 2 && enabled) return { eligible: true, postponements, reason: 'Secondo rinvio consecutivo: rimborso integrale.' };
  if (postponements === 1) return { eligible: false, postponements, reason: 'Un rinvio: il biglietto vale per la data di recupero.' };
  return { eligible: false, postponements, reason: postponements ? 'Rimborso al secondo rinvio non attivo.' : 'Nessun rinvio.' };
}
