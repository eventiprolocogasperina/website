import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPosCatalog } from '@/server/domain/cash/catalog';
import { cassaAccess, catalogFor, errorResponse, noStore, wrongRegister } from '../_lib';

export const dynamic = 'force-dynamic';

/** Prodotti della cassa con prezzi e scorte. Il telefono lo conserva per vendere anche senza rete. */
export async function GET(request: Request) {
  const { ctx, edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const registerId = z.uuid().parse(new URL(request.url).searchParams.get('cassa'));
    const other = wrongRegister(ctx, registerId);
    if (other) return other;
    const catalog = await getPosCatalog(registerId);
    if (catalog.edition.slug !== edition) return NextResponse.json({ code: 'FORBIDDEN', error: 'Questa cassa è di un’altra edizione.' }, { status: 403 });
    return NextResponse.json(catalogFor(ctx, edition, catalog), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
