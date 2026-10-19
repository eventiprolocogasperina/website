import { NextResponse } from 'next/server';
import { openSession } from '@/server/domain/cash/sessions';
import { cassaAccess, errorResponse, noStore, readJson } from '../_lib';

/** Apre il turno della cassa con il fondo cassa (o si unisce a quello già aperto). */
export async function POST(request: Request) {
  const { ctx, denied } = await cassaAccess(request, 'pos.open_close_session');
  if (denied) return denied;
  try {
    return NextResponse.json(await openSession(ctx, (await readJson(request)) as never), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
