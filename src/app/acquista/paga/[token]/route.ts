import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { editions, ordersV2 } from '@/server/db/schema';
import { siteUrl } from '@/server/email/send';
import { paymentForm } from '@/server/integrations/nexi';
import { log } from '@/server/log';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Avvio del pagamento di un ordine online in attesa: pagina che invia subito il modulo firmato a Nexi
 * (Nexi vuole un POST dal browser). Importo e codice li legge dal database, mai dalla richiesta.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = /^[A-Za-z0-9_-]{16,100}$/.test(token)
    ? await getDb()
        .select({ code: ordersV2.code, status: ordersV2.status, totalCents: ordersV2.totalCents, expiresAt: ordersV2.expiresAt, channel: ordersV2.channel, edition: editions.slug })
        .from(ordersV2)
        .innerJoin(editions, eq(editions.id, ordersV2.editionId))
        .where(and(eq(ordersV2.accessToken, token), isNull(ordersV2.deletedAt)))
    : [];
  if (!row) return new NextResponse('Ordine non trovato.', { status: 404 });
  const back = `${siteUrl()}/acquista/${row.edition}/conferma/${token}`;
  const expired = row.status === 'expired' || (row.status === 'pending' && row.expiresAt !== null && row.expiresAt.getTime() <= Date.now());
  if (row.status !== 'pending' || expired || !['online', 'paylink'].includes(row.channel) || row.totalCents <= 0) {
    return NextResponse.redirect(back, 303);
  }

  let form;
  try {
    form = paymentForm(row);
  } catch (error) {
    log.error('Pagamento Nexi non configurato', { error });
    return NextResponse.redirect(`${back}?esito=errore`, 303);
  }
  // Se il cliente annulla su Nexi torna alla sua pagina d'ordine, dove può riprovare.
  form.fields.url_back = `${back}?esito=annullato`;

  const inputs = Object.entries(form.fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pagamento sicuro</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f6f7fb;color:#151a2b}main{text-align:center;padding:24px}button{margin-top:16px;font:inherit;padding:12px 20px;border-radius:8px;border:0;background:#1b4baa;color:#fff;font-weight:600}</style></head>
<body><main><p>Ti stiamo portando sulla pagina di pagamento sicura di Nexi…</p>
<form id="nexi" method="post" action="${esc(form.action)}">${inputs}<noscript><button type="submit">Continua al pagamento</button></noscript></form></main>
<script>document.getElementById('nexi').submit()</script></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
