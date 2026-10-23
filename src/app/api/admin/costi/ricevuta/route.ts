import { NextResponse } from 'next/server';
import { getAdminCtx } from '@/server/auth/context';
import { canSomewhere } from '@/server/auth/permissions';
import { log } from '@/server/log';
import { uploadPrivateReceipt } from '@/server/storage/receipts';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

/**
 * Carica la ricevuta di un costo come asset privato e restituisce il suo riferimento (mai un URL).
 * Il costo la collega al salvataggio, dove si ricontrolla costs.write sull'edizione.
 */
export async function POST(request: Request) {
  const ctx = await getAdminCtx();
  if (!ctx) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  if (!canSomewhere(ctx, 'costs.write')) return NextResponse.json({ error: 'Non hai i permessi per questa operazione.' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Nessun file allegato.' }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: 'Formato non supportato: carica un PDF o un’immagine.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Il file è troppo grande: al massimo 8 MB.' }, { status: 400 });
  try {
    const ref = await uploadPrivateReceipt(Buffer.from(await file.arrayBuffer()), file.type === 'application/pdf');
    return NextResponse.json({ receipt: ref }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    log.error('Ricevuta del costo non caricata', { error });
    return NextResponse.json({ error: 'Caricamento non riuscito. Riprova.' }, { status: 500 });
  }
}
