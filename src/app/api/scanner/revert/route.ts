import { revertCheckin } from '@/server/domain/checkin';
import { body, scannerRoute } from '../respond';

/** "Annulla ultimo": il volontario lo vede per 30 secondi dopo un ingresso valido. */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.revert', async (ctx) => {
    await revertCheckin(ctx, { checkinId: String(input.checkinId ?? ''), reason: 'Annullato dallo scanner' });
    return { ok: true };
  });
}
