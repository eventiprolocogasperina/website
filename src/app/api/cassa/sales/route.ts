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

/** Ultime vendite di un turno (per l'annullo). */
export async function GET(request: Request) {
  const { edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const sessionId = z.uuid().parse(new URL(request.url).searchParams.get('turno'));
    return NextResponse.json({ sales: await recentSales(edition, sessionId) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
