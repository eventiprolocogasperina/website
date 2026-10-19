import { getPosCatalog } from '@/server/domain/cash/catalog';
import { departmentQueue } from '@/server/domain/cash/departments';
import { log } from '@/server/log';
import { cassaAccess } from '../_lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TICK_MS = 2500;
/** Ogni flusso dura meno del limite di una funzione Vercel: EventSource si ricollega da solo. */
const LIFETIME_MS = 50_000;

/**
 * Aggiornamenti in tempo reale per la cassa (§12.1 punto 4) e lo schermo reparto (§12.2), con SSE.
 * A differenza di /api/cashier/realtime (memoria del singolo server) legge il database a ogni giro,
 * così funziona anche con più istanze: tutti i telefoni vedono gli esauriti degli altri.
 *   ?cassa=<id>      → evento `catalog` quando cambiano scorte o prezzi
 *   ?reparto=<nome>  → evento `tickets` quando cambiano le comande del reparto
 */
export async function GET(request: Request) {
  const { ctx, edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const registerId = url.searchParams.get('cassa');
  const department = url.searchParams.get('reparto');
  if (!registerId && !department) return new Response('Parametro mancante', { status: 400 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let last = '';
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const started = Date.now();
      let busy = false;
      const tick = async () => {
        if (busy) return;
        busy = true;
        try {
          if (registerId) {
            const catalog = await getPosCatalog(registerId);
            if (catalog.edition.slug !== edition) throw new Error('cassa di un’altra edizione');
            if (catalog.version !== last) send('catalog', catalog);
            last = catalog.version;
          } else {
            const tickets = await departmentQueue(ctx, edition, department!);
            const version = JSON.stringify(tickets);
            if (version !== last) send('tickets', tickets);
            last = version;
          }
          if (Date.now() - started > LIFETIME_MS) close();
          else controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (error) {
          log.warn('Flusso della cassa interrotto', { error });
          close();
        } finally {
          busy = false;
        }
      };
      const close = () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // già chiuso
        }
      };
      controller.enqueue(encoder.encode('retry: 2000\n\n'));
      await tick();
      timer = setInterval(tick, TICK_MS);
      request.signal.addEventListener('abort', close);
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
