import { answerCounts, previewOrder } from '@/server/domain/checkin';
import { body, scannerRoute, str } from '../respond';

/**
 * Lettura di un QR: non registra niente. Restituisce l'ordine con i biglietti da confermare
 * (`order`) oppure l'esito del biglietto letto (già entrato, da pagare, annullato…), con i valori
 * delle risposte usate dai pulsanti dei moduli.
 */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.scan', async (ctx) => {
    const result = await previewOrder(ctx, { qrToken: str(input.qrToken), ticketId: str(input.ticketId), checkinListId: String(input.checkinListId ?? ''), sessionId: str(input.sessionId) ?? null });
    const keys = Array.isArray(input.questionKeys) ? input.questionKeys.filter((k): k is string => typeof k === 'string').slice(0, 10) : [];
    const answers = keys.length && result.result === 'already_used' ? await answerCounts(result.ticket.orderId, keys) : {};
    return { ...result, answers };
  });
}
