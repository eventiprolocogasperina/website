'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requestIp } from '@/server/auth/context';
import { isRateLimited, recordFailure } from '@/server/auth/rateLimit';
import { cookieOptions, DEVICE_COOKIE, DEVICE_TTL_S, PIN_COOKIE } from '@/server/auth/session';
import { completePairing } from '@/server/domain/devices';
import { isDomainError } from '@/server/domain/errors';

export type PairState = { error?: string };

/**
 * Il token si usa con un POST (questo form) e non all'apertura del link, così le anteprime dei link non lo consumano.
 * Serve anche il PIN mostrato accanto al QR; oltre ai 5 tentativi per QR, un limite per IP.
 */
export async function pairDevice(_prev: PairState, formData: FormData): Promise<PairState> {
  const ip = await requestIp();
  const key = `pair:${ip ?? 'sconosciuto'}`;
  if (isRateLimited(key, 10)) return { error: 'Troppi tentativi da questo dispositivo. Aspetta qualche minuto e riprova.' };
  const store = await cookies();
  let kind: 'pos' | 'scanner';
  try {
    const pin = String(formData.get('pin') ?? '').replace(/\D/g, '');
    const { deviceToken, device } = await completePairing(String(formData.get('token') ?? ''), pin, ip, store.get(DEVICE_COOKIE)?.value);
    store.set(DEVICE_COOKIE, deviceToken, cookieOptions(DEVICE_TTL_S));
    store.delete(PIN_COOKIE);
    kind = device.kind;
  } catch (error) {
    recordFailure(key);
    return { error: isDomainError(error) ? error.message : 'Abbinamento non riuscito. Riprova.' };
  }
  // Un dispositivo di cassa apre la nuova cassa (§12.1); la vecchia /cashier resta raggiungibile a mano.
  redirect(kind === 'pos' ? '/cassa' : '/scanner');
}
