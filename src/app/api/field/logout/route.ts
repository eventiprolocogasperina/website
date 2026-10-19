import { NextResponse } from 'next/server';
import { destroySession } from '@/server/auth/session';

/** Il volontario esce: il dispositivo resta abbinato e torna alla richiesta del PIN. */
export async function POST() {
  await destroySession('pin');
  return NextResponse.json({ success: true });
}
