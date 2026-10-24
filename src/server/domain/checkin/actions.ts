import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { extensionPoints } from '@/modules/registry';
import type { ScannerAction } from '@/modules/types';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { attendeeAnswers } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { lockOrder } from '@/server/domain/orders/shared';
import { ADMITTING_STATUSES, type OrderStatus } from '@/server/domain/payments/status';
import { answerCount, incrementAnswer } from './rules';
import { assertCanOn } from './scan';

/** Pulsanti dei moduli sotto l'esito dello scanner (§7 scanner.actions), es. "+1 Bambino" di activities. */
export function scannerActionsFor(edition: { enabledModules: string[]; moduleSettings: unknown }): ScannerAction[] {
  return extensionPoints.scannerActions(edition as Parameters<typeof extensionPoints.scannerActions>[0]);
}

/** Valori attuali delle risposte usate dai pulsanti, per mostrarli sotto l'esito ("Bambini: 2"). */
export async function answerCounts(orderId: string, questionKeys: string[]): Promise<Record<string, number>> {
  if (!questionKeys.length) return {};
  const rows = await getDb()
    .select({ key: attendeeAnswers.questionKey, value: attendeeAnswers.value })
    .from(attendeeAnswers)
    .where(and(eq(attendeeAnswers.orderId, orderId), isNull(attendeeAnswers.ticketId), inArray(attendeeAnswers.questionKey, questionKeys)));
  return Object.fromEntries(questionKeys.map((k) => [k, answerCount(rows.find((r) => r.key === k)?.value, k) ?? 0]));
}

export const ScannerActionInput = z.object({ orderId: z.string().uuid(), actionKey: z.string().trim().min(1).max(60) });

export type ScannerActionResult = { questionKey: string; label: string; before: number; after: number };

/**
 * Applica un'azione dello scanner all'ordine: somma l'incremento alla risposta (`attendee_answers`
 * a livello di ordine) e lo scrive nel registro con operatore e dispositivo. L'ordine è bloccato,
 * così due "+1" da due telefoni insieme fanno +2 e non +1.
 */
export async function applyScannerAction(ctx: Ctx, input: z.input<typeof ScannerActionInput>): Promise<ScannerActionResult> {
  const data = ScannerActionInput.parse(input);
  return withTransaction((tx) => incrementOnOrder(tx, ctx, data.orderId, data.actionKey));
}

/** Il conteggio dentro una transazione già aperta: da solo, o insieme alla vendita (paid.ts). */
export async function incrementOnOrder(tx: Tx, ctx: Ctx, orderId: string, actionKey: string, extra: Record<string, unknown> = {}): Promise<ScannerActionResult> {
  const { order, edition } = await lockOrder(tx, orderId);
  assertCanOn(ctx, 'checkin.scan', edition.slug);
  const action = scannerActionsFor(edition).find((a) => a.key === actionKey);
  if (!action) throw new DomainError('CONFLICT', { message: 'Questo pulsante non è più attivo. Ricarica lo scanner.' });
  if (!ADMITTING_STATUSES.includes(order.status as OrderStatus)) throw new DomainError('CONFLICT', { message: 'L’ordine non è pagato.' });

  const [existing] = await tx
    .select()
    .from(attendeeAnswers)
    .where(and(eq(attendeeAnswers.orderId, order.id), isNull(attendeeAnswers.ticketId), eq(attendeeAnswers.questionKey, action.questionKey)));
  const change = incrementAnswer(existing?.value, action.questionKey, action.increment);
  if (!change.ok) throw new DomainError('VALIDATION', { message: change.error });

  if (existing) await tx.update(attendeeAnswers).set({ value: change.stored, updatedAt: new Date() }).where(eq(attendeeAnswers.id, existing.id));
  else await tx.insert(attendeeAnswers).values({ orderId: order.id, questionKey: action.questionKey, value: change.stored });

  await audit(tx, ctx, 'order.scanner_action', {
    entityType: 'order',
    entityId: order.id,
    edition: edition.slug,
    before: { [action.questionKey]: change.before },
    after: { [action.questionKey]: change.after, pulsante: action.label, ...extra },
  });
  return { questionKey: action.questionKey, label: action.label, before: change.before, after: change.after };
}
