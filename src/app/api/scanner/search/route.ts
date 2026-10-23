import { searchTickets } from '@/server/domain/checkin';
import { scannerRoute } from '../respond';

export const dynamic = 'force-dynamic';

/** Ricerca manuale per nome o codice ordine. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return scannerRoute('checkin.search', async (ctx) => ({ orders: await searchTickets(ctx, { checkinListId: params.get('lista') ?? '', q: params.get('q') ?? '' }) }));
}
