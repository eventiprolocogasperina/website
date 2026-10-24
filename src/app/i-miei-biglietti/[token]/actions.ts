'use server';

import { revalidatePath } from 'next/cache';
import { publicCtx } from '@/server/auth/context-shared';
import { customerMoveSession } from '@/server/domain/orders';
import { requestRefund } from '@/server/domain/refunds';
import { runPublic } from '@/server/public/run-public';

export async function changeDateAction(token: string, toSessionId: string) {
  const res = await runPublic('change-date', 10, (ip) => customerMoveSession(ip, { accessToken: token, toSessionId }));
  if (res.ok) revalidatePath(`/i-miei-biglietti/${token}`);
  return res;
}

export async function requestRefundAction(token: string, input: { orderCode: string; reason: string; iban: string; holderName: string }) {
  const res = await runPublic('refund', 5, async (ip) => {
    const r = await requestRefund(publicCtx(ip), { ...input, accessToken: token });
    return { amountCents: r.amountCents };
  });
  if (res.ok) revalidatePath(`/i-miei-biglietti/${token}`);
  return res;
}
