import { NextResponse } from 'next/server';
import { isRateLimited, recordFailure } from '@/server/auth/rateLimit';
import { voidSale } from '@/server/domain/cash/void';
import { DomainError } from '@/server/domain/errors';
import { cassaAccess, errorResponse, noStore, readJson } from '../../../_lib';

/** Annullo di un contributo con il PIN di un responsabile (pos.void) e il motivo. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, denied } = await cassaAccess(request);
  if (denied) return denied;
  // Contro i tentativi a raffica sul PIN del responsabile, oltre al blocco dopo 5 errori.
  const key = `void-pin:${ctx.device?.id ?? ctx.user?.id ?? 'admin'}`;
  if (isRateLimited(key, 10)) return NextResponse.json({ code: 'RATE_LIMITED', error: 'Troppi tentativi. Aspetta qualche minuto.' }, { status: 429 });
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    return NextResponse.json(await voidSale(ctx, { ...body, orderId: (await params).id } as never), { headers: noStore });
  } catch (error) {
    if (error instanceof DomainError && error.code === 'FORBIDDEN') recordFailure(key);
    return errorResponse(error);
  }
}
