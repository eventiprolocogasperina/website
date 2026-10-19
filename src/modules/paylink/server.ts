import 'server-only';
import type { Ctx } from '@/server/auth/context-shared';
import { createOrder, type CreateOrderInput, type OrderResult } from '@/server/domain/orders';

/**
 * Ordine creato dall'admin e pagato dal cliente con un link (canale `paylink`): resta in attesa per
 * le ore impostate nel modulo, poi scade e libera i posti. La pagina di pagamento del link arriva
 * con il checkout nuovo (prompt 13): fino ad allora il pay-link di oggi resta nella pagina Ordini.
 */
export async function createPaylinkOrder(ctx: Ctx, input: Omit<CreateOrderInput, 'channel' | 'payNow'>): Promise<OrderResult> {
  return createOrder(ctx, { ...input, channel: 'paylink' });
}
