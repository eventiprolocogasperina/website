import { NextResponse } from 'next/server';
import { collectPayOnSite, searchPayOnSite } from '@/server/domain/cash/collect';
import { cassaAccess, errorResponse, noStore, readJson } from '../_lib';

export const dynamic = 'force-dynamic';

/** "Da incassare": ordini "Paga in loco" in attesa dell'edizione, per codice o nome (`?q=`). */
export async function GET(request: Request) {
  const { ctx, edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return NextResponse.json({ orders: await searchPayOnSite(ctx, edition, q) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Incassa nel turno in corso: l'importo lo calcola il server dall'ordine, mai dal telefono. */
export async function POST(request: Request) {
  const { ctx, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const result = await collectPayOnSite(ctx, (await readJson(request)) as never, { via: 'cassa' });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
