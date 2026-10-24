import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { systemCtx } from '@/server/auth/context-shared';
import { toErrorBody } from '@/server/domain/errors';
import { expirePendingOrders } from '@/server/domain/orders';
import { log } from '@/server/log';

// Vercel Cron (vercel.json) chiama questo indirizzo ogni 5 minuti con "Authorization: Bearer CRON_SECRET".
export const dynamic = 'force-dynamic';

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const result = await expirePendingOrders(systemCtx('scadenza ordini'));
    return NextResponse.json(result);
  } catch (error) {
    log.error('Scadenza degli ordini non riuscita', { error });
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
