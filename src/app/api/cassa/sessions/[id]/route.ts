import { NextResponse } from 'next/server';
import { closeSession, sessionSummary } from '@/server/domain/cash/sessions';
import { cassaAccess, errorResponse, noStore, readJson } from '../../_lib';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** Riepilogo del turno: contante atteso e totali per metodo (per la chiusura). */
export async function GET(request: Request, { params }: Params) {
  const { ctx, denied } = await cassaAccess(request, 'pos.open_close_session');
  if (denied) return denied;
  try {
    const s = await sessionSummary(ctx, (await params).id);
    return NextResponse.json(
      {
        id: s.session.id,
        registerName: s.registerName,
        openedAt: s.session.openedAt.toISOString(),
        openedByName: s.openedByName,
        closedAt: s.session.closedAt?.toISOString() ?? null,
        openingFloatCents: s.session.openingFloatCents,
        expectedCashCents: s.expectedCashCents,
        zReportNumber: s.session.zReportNumber,
        totals: s.totals,
      },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/** Chiusura Z: conteggio per taglio e nota. */
export async function POST(request: Request, { params }: Params) {
  const { ctx, denied } = await cassaAccess(request, 'pos.open_close_session');
  if (denied) return denied;
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    return NextResponse.json(await closeSession(ctx, { ...body, sessionId: (await params).id } as never), { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
