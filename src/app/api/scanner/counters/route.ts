import { listCounters } from '@/server/domain/checkin';
import { scannerRoute } from '../respond';

export const dynamic = 'force-dynamic';

/** Contatori in alto nello scanner, aggiornati anche con gli ingressi degli altri telefoni. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return scannerRoute('checkin.stats', (ctx) => listCounters(ctx, params.get('lista') ?? '', params.get('data') || null));
}
