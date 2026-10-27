import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';

// Per un servizio di monitoraggio esterno (es. UptimeRobot): 200 se sito e database rispondono,
// 503 altrimenti. Nessun dettaglio nella risposta: è un indirizzo pubblico.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
