import { NextResponse } from 'next/server';
import { siteUrl } from '@/server/email/send';
import { testPaymentOutcome } from '@/server/integrations/nexi/test-payment';
import { log } from '@/server/log';

export const dynamic = 'force-dynamic';

/**
 * Ritorno del pagamento di prova da 1 € (Sistema → Pagamenti): verifica la firma e torna alla pagina
 * con l'esito. Non tocca ordini né pagamenti. La notifica server-to-server riceve solo un 200.
 */
async function handle(params: Record<string, string>, fromBrowser: boolean) {
  const esito = testPaymentOutcome(params);
  log.info('Esito del pagamento di prova Nexi', { esito });
  if (!fromBrowser) return new NextResponse('OK');
  return NextResponse.redirect(`${siteUrl()}/admin/sistema/pagamenti?prova=${esito}`, 303);
}

export async function GET(req: Request) {
  return handle(Object.fromEntries(new URL(req.url).searchParams), true);
}

export async function POST(req: Request) {
  const form = await req.formData();
  // La notifica di Nexi (urlpost) è una chiamata da server; il ritorno del browser chiede una pagina HTML.
  const fromBrowser = (req.headers.get('accept') ?? '').includes('text/html');
  return handle(Object.fromEntries([...form].map(([k, v]) => [k, String(v)])), fromBrowser);
}
