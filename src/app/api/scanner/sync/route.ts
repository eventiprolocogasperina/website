import { syncOfflineCheckins } from '@/server/domain/checkin';
import { body, scannerRoute } from '../respond';

/** Passaggi accodati offline: idempotente sul clientId, si può rimandare senza doppioni. */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.scan', async (ctx) => ({ outcomes: await syncOfflineCheckins(ctx, { items: Array.isArray(input.items) ? input.items : [] }) }));
}
