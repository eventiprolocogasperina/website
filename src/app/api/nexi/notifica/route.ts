import { confirmLegacyPayment } from '@/lib/tickets/legacyPayment';
import { verifyResultMac } from '@/server/integrations/nexi/mac';
import { log } from '@/server/log';

export const dynamic = 'force-dynamic';

/**
 * Notifica server-to-server di Nexi (`urlpost`) per gli ordini del checkout classico: arriva anche se il
 * cliente chiude il browser dopo aver pagato, quando il ritorno su /api/nexi/callback non avviene mai.
 * Idempotente: se l'ordine è già pagato non rifà né email né messaggi. Risponde 200 a ogni esito firmato
 * che non è un errore nostro, così Nexi non lo ripete all'infinito.
 */
export async function POST(req: Request) {
  const key = process.env.NEXI_MAC_KEY;
  if (!key) return new Response('Pagamenti non configurati', { status: 500 });

  const type = req.headers.get('content-type') ?? '';
  const params: Record<string, string> = type.includes('application/json')
    ? Object.fromEntries(Object.entries((await req.json().catch(() => ({}))) as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
    : Object.fromEntries([...(await req.formData().catch(() => new FormData()))].map(([k, v]) => [k, String(v)]));
  const codTrans = params.codTrans;
  if (!codTrans) return new Response('KO', { status: 400 });

  if (!verifyResultMac(params, key)) {
    log.error('Nexi: firma non valida, pagamento non confermato', { source: 'server', codTrans });
    return new Response('KO', { status: 400 });
  }
  if (params.esito !== 'OK') return new Response('OK'); // annullato o fallito: ci pensa il ritorno del browser

  try {
    await confirmLegacyPayment(codTrans, params.importo);
    return new Response('OK');
  } catch (error) {
    log.error('Notifica Nexi non elaborata', { source: 'server', codTrans, error });
    return new Response('ERRORE', { status: 500 });
  }
}
