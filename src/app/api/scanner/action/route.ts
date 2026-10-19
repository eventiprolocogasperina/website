import { applyScannerAction } from '@/server/domain/checkin';
import { body, scannerRoute } from '../respond';

/** Pulsante di un modulo sotto l'esito, es. "+1 Bambino". */
export async function POST(request: Request) {
  const input = await body(request);
  return scannerRoute('checkin.scan', (ctx) => applyScannerAction(ctx, { orderId: String(input.orderId ?? ''), actionKey: String(input.actionKey ?? '') }));
}
