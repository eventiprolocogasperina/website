import { answerCounts, collectAtGate, collectQuote } from '@/server/domain/checkin';
import { body, scannerRoute, str } from '../respond';

export const dynamic = 'force-dynamic';

/** Popup "Da pagare" del varco: importo e turni di cassa aperti, sempre dal server. */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get('orderId') ?? '';
  return scannerRoute('checkin.scan', (ctx) => collectQuote(ctx, orderId, 'varco'));
}

/** Incassa un ordine "Paga in loco" al varco (checkin.collect_payment, controllato nel dominio) e riapre l'ordine per la conferma di gruppo. */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.scan', async (ctx) => {
    const r = await collectAtGate(ctx, {
      ticketId: String(input.ticketId ?? ''),
      checkinListId: String(input.checkinListId ?? ''),
      sessionId: str(input.sessionId) ?? null,
      cashSessionId: str(input.cashSessionId) ?? null,
      method: str(input.method) as 'cash' | 'card_pos',
      cashReceivedCents: typeof input.cashReceivedCents === 'number' ? input.cashReceivedCents : null,
      idempotencyKey: str(input.idempotencyKey) ?? '',
      expectedDueCents: typeof input.expectedDueCents === 'number' ? input.expectedDueCents : -1,
    });
    const keys = Array.isArray(input.questionKeys) ? input.questionKeys.filter((k): k is string => typeof k === 'string').slice(0, 10) : [];
    const s = r.scan;
    const answers = keys.length && s.result === 'already_used' ? await answerCounts(s.ticket.orderId, keys) : {};
    return { collected: r.collected, scan: { ...s, answers } };
  });
}
