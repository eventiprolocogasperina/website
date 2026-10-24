import { processResult } from '@/server/integrations/nexi';
import { log } from '@/server/log';

export const dynamic = 'force-dynamic';

/**
 * Notifica server-to-server di Nexi (`urlpost`): arriva anche se il cliente chiude il browser.
 * Idempotente. Risponde 200 a ogni esito firmato, così Nexi non ripete la notifica all'infinito.
 */
export async function POST(req: Request) {
  const type = req.headers.get('content-type') ?? '';
  const params: Record<string, string> = type.includes('application/json')
    ? Object.fromEntries(Object.entries((await req.json()) as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
    : Object.fromEntries([...(await req.formData())].map(([k, v]) => [k, String(v)]));
  try {
    const result = await processResult(params, 'server');
    if (!result.ok) return new Response('KO', { status: result.reason === 'mac' ? 400 : 404 });
    return new Response('OK');
  } catch (error) {
    log.error('Notifica Nexi non elaborata', { codTrans: params.codTrans, error });
    return new Response('ERRORE', { status: 500 });
  }
}
