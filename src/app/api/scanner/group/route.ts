import { answerCounts, checkinGroup } from '@/server/domain/checkin';
import { body, scannerRoute, str } from '../respond';

/** "Fai entrare N": un passaggio per ogni biglietto scelto dello stesso ordine, in una transazione. */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.scan', async (ctx) => {
    const result = await checkinGroup(ctx, { checkinListId: String(input.checkinListId ?? ''), sessionId: str(input.sessionId) ?? null, items: Array.isArray(input.items) ? input.items : [] });
    const keys = Array.isArray(input.questionKeys) ? input.questionKeys.filter((k): k is string => typeof k === 'string').slice(0, 10) : [];
    const answers = keys.length && result.entered.length ? await answerCounts(result.ticket.orderId, keys) : {};
    return { ...result, answers };
  });
}
