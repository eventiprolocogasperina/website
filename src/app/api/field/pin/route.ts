import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDevice, requestIp } from '@/server/auth/context';
import { isRateLimited, recordFailure } from '@/server/auth/rateLimit';
import { createSession } from '@/server/auth/session';
import { verifyFieldPin } from '@/server/domain/devices';

const Body = z.object({ userId: z.uuid(), pin: z.string().regex(/^\d{4,6}$/) });

/** Entrata con il PIN su un dispositivo abbinato. */
export async function POST(request: Request) {
  const device = await getDevice();
  if (!device) return NextResponse.json({ error: 'Questo dispositivo non è abbinato.' }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Il PIN deve avere da 4 a 6 cifre.' }, { status: 400 });

  // Oltre al blocco per utente (5 errori), un limite per dispositivo contro i tentativi a raffica.
  const key = `pin:${device.id}`;
  if (isRateLimited(key, 20)) return NextResponse.json({ error: 'Troppi tentativi da questo dispositivo. Aspetta qualche minuto.' }, { status: 429 });

  const result = await verifyFieldPin(device, parsed.data.userId, parsed.data.pin, await requestIp());
  if (!result.ok) {
    recordFailure(key);
    return NextResponse.json({ error: result.error, locked: result.locked ?? false }, { status: 401 });
  }
  await createSession({ sub: result.user.id, role: 'pin', did: device.id });
  return NextResponse.json({ user: result.user });
}
