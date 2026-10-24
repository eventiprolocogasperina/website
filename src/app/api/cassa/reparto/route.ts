import { NextResponse } from 'next/server';
import { z } from 'zod';
import { departmentQueue, setPrepStatus } from '@/server/domain/cash/departments';
import { cassaAccess, errorResponse, noStore, readJson } from '../_lib';

export const dynamic = 'force-dynamic';

/** Comande di un reparto (schermo cucina, §12.2). */
export async function GET(request: Request) {
  const { ctx, edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const department = z.string().trim().min(1).max(80).parse(new URL(request.url).searchParams.get('reparto'));
    return NextResponse.json({ tickets: await departmentQueue(ctx, edition, department) }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Sposta una comanda di colonna: da preparare → in preparazione → pronta → consegnata. */
export async function POST(request: Request) {
  const { ctx, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    await setPrepStatus(ctx, (await readJson(request)) as never);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
