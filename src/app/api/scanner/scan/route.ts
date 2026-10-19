import { answerCounts, listCounters, scan } from '@/server/domain/checkin';
import { body, scannerRoute, str } from '../respond';

/**
 * Lettura di un QR (o di un biglietto dalla ricerca). Insieme all'esito restituisce i contatori
 * della lista e i valori delle risposte usate dai pulsanti dei moduli, per non fare altre chiamate.
 */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.scan', async (ctx) => {
    const listId = String(input.checkinListId ?? '');
    const sessionId = str(input.sessionId) ?? null;
    const result = await scan(ctx, { qrToken: str(input.qrToken), ticketId: str(input.ticketId), checkinListId: listId, sessionId });
    const keys = Array.isArray(input.questionKeys) ? input.questionKeys.filter((k): k is string => typeof k === 'string').slice(0, 10) : [];
    const [counter, answers] = await Promise.all([
      listCounters(ctx, listId, sessionId),
      result.result === 'valid' || result.result === 'already_used' ? answerCounts(result.ticket.orderId, keys) : Promise.resolve({}),
    ]);
    return { ...result, counter, answers };
  });
}
