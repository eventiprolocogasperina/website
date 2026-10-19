import { applyScannerAction, payScannerAction, scannerActionQuote } from '@/server/domain/checkin';
import { body, scannerRoute, str } from '../respond';

export const dynamic = 'force-dynamic';

/** Popup di cassa di un pulsante a pagamento: prodotto, prezzo e turno di cassa, sempre dal server. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  return scannerRoute('checkin.scan', (ctx) => scannerActionQuote(ctx, { orderId: q.get('orderId') ?? '', actionKey: q.get('actionKey') ?? '' }));
}

/** Pulsante di un modulo sotto l'esito, es. "+1 Bambino". Con `method` incassa anche il prodotto del pulsante. */
export async function POST(request: Request) {
  const input = await body(request);
  const orderId = String(input.orderId ?? '');
  const actionKey = String(input.actionKey ?? '');
  if (!input.method) return scannerRoute('checkin.scan', (ctx) => applyScannerAction(ctx, { orderId, actionKey }));
  return scannerRoute('checkin.scan', (ctx) =>
    payScannerAction(ctx, {
      orderId,
      actionKey,
      method: str(input.method) as 'cash' | 'card_pos',
      idempotencyKey: str(input.idempotencyKey) ?? '',
      expectedTotalCents: typeof input.expectedTotalCents === 'number' ? input.expectedTotalCents : -1,
    }),
  );
}
