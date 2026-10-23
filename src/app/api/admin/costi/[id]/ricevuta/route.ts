import { NextResponse } from 'next/server';
import { getAdminCtx } from '@/server/auth/context';
import { openReceipt } from '@/server/domain/costs';
import { toErrorBody } from '@/server/domain/errors';
import { log } from '@/server/log';
import { signedReceiptUrl } from '@/server/storage/receipts';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

/**
 * "Apri ricevuta" di un costo: costs.read sull'edizione del costo (o sull'associazione per i costi
 * generali), voce nel registro, poi un link firmato che scade dopo pochi minuti. Le ricevute di
 * prima (URL pubblico) si aprono allo stesso modo, in sola lettura.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminCtx();
  if (!ctx) return NextResponse.json({ code: 'UNAUTHORIZED', error: 'Accedi per continuare.' }, { status: 401, headers });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ code: 'NOT_FOUND', error: 'Ricevuta non trovata.' }, { status: 404, headers });
  try {
    const receipt = await openReceipt(ctx, id);
    const url = 'private' in receipt ? signedReceiptUrl(receipt.private) : receipt.legacyUrl;
    return NextResponse.redirect(url, { status: 302, headers });
  } catch (error) {
    const { status, body } = toErrorBody(error);
    if (status >= 500) log.error('Ricevuta del costo non aperta', { costId: id, error });
    return NextResponse.json(body, { status, headers });
  }
}
