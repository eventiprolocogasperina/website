'use server';

import { placeOrder, quoteCart, type CartInput, type PlaceOrderInput } from '@/server/domain/checkout';
import { runPublic } from '@/server/public/run-public';

export async function quoteAction(input: CartInput) {
  return runPublic('quote', 200, () => quoteCart(input));
}

export async function placeOrderAction(input: PlaceOrderInput) {
  return runPublic('order', 20, async (ip) => {
    const o = await placeOrder(ip, input);
    return { token: o.accessToken, code: o.code, status: o.status, totalCents: o.totalCents, expiresAt: o.expiresAt?.toISOString() ?? null, edition: o.edition };
  });
}
