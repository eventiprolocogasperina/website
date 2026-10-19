import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { orderLines, ordersV2 } from '@/server/db/schema';
import { isDomainError } from '@/server/domain/errors';
import { moveSession } from '@/server/domain/orders';

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
