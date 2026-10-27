import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recentSales, sell } from '@/server/domain/cash/sales';
import { cassaAccess, errorResponse, noStore, readJson } from '../_lib';

export const dynamic = 'force-dynamic';

/**
 * Registra un contributo. La usa sia la vendita normale sia la coda offline: la chiave di idempotenza
 * generata dal telefono fa sì che un reinvio restituisca la stessa vendita (`created: false`).
 */
export async function POST(request: Request) {
  const { ctx, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const result = await sell(ctx, (await readJson(request)) as never);
    return NextResponse.json(result, { status: result.created ? 201 : 200, headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Ultime vendite di un turno (per l'annullo); con `numero`, quelle della cassa con quel numero. */
export async function GET(request: Request) {
  const { edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const sessionId = z.uuid().parse(params.get('turno'));
    const number = params.get('numero') ? z.coerce.number().int().positive().parse(params.get('numero')) : undefined;
    return NextResponse.json({ sales: await recentSales(edition, sessionId, 30, number) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
