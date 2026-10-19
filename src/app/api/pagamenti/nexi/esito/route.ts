import { NextResponse } from 'next/server';
import { siteUrl } from '@/server/email/send';
import { processResult } from '@/server/integrations/nexi';

export const dynamic = 'force-dynamic';

/** Ritorno del browser da Nexi (`url`): registra l'esito (idempotente) e porta alla pagina dell'ordine. */
async function handle(params: Record<string, string>) {
  const result = await processResult(params, 'browser');
  if (!result.ok) return NextResponse.redirect(`${siteUrl()}/acquista/esito-non-valido`, 303);
  const { order, outcome } = result;
  const esito = outcome === 'succeeded' ? '' : `?esito=${outcome === 'cancelled' ? 'annullato' : outcome === 'pending' ? 'in-attesa' : outcome === 'amount_mismatch' ? 'verifica' : 'rifiutato'}`;
  return NextResponse.redirect(`${siteUrl()}/acquista/${order.edition}/conferma/${order.accessToken}${esito}`, 303);
}

export async function GET(req: Request) {
  return handle(Object.fromEntries(new URL(req.url).searchParams));
}

export async function POST(req: Request) {
  const form = await req.formData();
  return handle(Object.fromEntries([...form].map(([k, v]) => [k, String(v)])));
}
