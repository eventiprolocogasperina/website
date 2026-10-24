import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { csvResponse } from '@/lib/csv';
import { authorize } from '@/server/auth/context';
import { getDb } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { editionStats } from '@/server/domain/stats';
import { statsCsv } from '@/server/domain/stats/csv';

export const dynamic = 'force-dynamic';

/** Le statistiche dell'edizione in CSV (solo aggregati, nessun dato personale). */
export async function GET(_req: Request, { params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  const { denied } = await authorize('reports.export', { edition });
  if (denied) return denied;
  const [e] = await getDb().select({ id: editions.id }).from(editions).where(eq(editions.slug, edition));
  if (!e) return NextResponse.json({ error: 'Edizione non trovata.' }, { status: 404 });
  return csvResponse(statsCsv(await editionStats(e.id)), `statistiche-${edition}-${new Date().toISOString().slice(0, 10)}.csv`);
}
