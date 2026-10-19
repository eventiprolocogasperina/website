'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requestIp } from '@/server/auth/context';
import { cookieOptions, DEVICE_COOKIE, DEVICE_TTL_S, PIN_COOKIE } from '@/server/auth/session';
import { completePairing } from '@/server/domain/devices';
import { isDomainError } from '@/server/domain/errors';

export type PairState = { error?: string };

/** Il token si usa con un POST (questo form) e non all'apertura del link, così le anteprime dei link non lo consumano. */
export async function pairDevice(_prev: PairState, formData: FormData): Promise<PairState> {
  const store = await cookies();
  let kind: 'pos' | 'scanner';
  try {
    const { deviceToken, device } = await completePairing(String(formData.get('token') ?? ''), await requestIp(), store.get(DEVICE_COOKIE)?.value);
    store.set(DEVICE_COOKIE, deviceToken, cookieOptions(DEVICE_TTL_S));
    store.delete(PIN_COOKIE);
    kind = device.kind;
  } catch (error) {
    return { error: isDomainError(error) ? error.message : 'Abbinamento non riuscito. Riprova.' };
  }
  redirect(kind === 'pos' ? '/cashier' : '/scanner');
}
