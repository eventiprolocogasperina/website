import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPosCatalog } from '@/server/domain/cash/catalog';
import { cassaAccess, errorResponse, noStore } from '../_lib';

export const dynamic = 'force-dynamic';

/** Prodotti della cassa con prezzi e scorte. Il telefono lo conserva per vendere anche senza rete. */
export async function GET(request: Request) {
  const { edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const registerId = z.uuid().parse(new URL(request.url).searchParams.get('cassa'));
    const catalog = await getPosCatalog(registerId);
    if (catalog.edition.slug !== edition) return NextResponse.json({ code: 'FORBIDDEN', error: 'Questa cassa è di un’altra edizione.' }, { status: 403 });
    return NextResponse.json(catalog, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
