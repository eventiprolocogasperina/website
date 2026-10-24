import { NextResponse } from 'next/server';
import { closeSession, sessionSummary } from '@/server/domain/cash/sessions';
import { cassaAccess, cassaPermissions, errorResponse, noStore, readJson } from '../../_lib';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const forbidden = () => NextResponse.json({ code: 'FORBIDDEN', error: 'Non hai i permessi per questa operazione.' }, { status: 403, headers: noStore });

/**
 * Riepilogo del turno: contante atteso e totali per metodo (per la chiusura). Chi chiude il turno senza
 * il permesso di vedere i totali (pos.view_totals) riceve solo i dati per contare: chiusura "alla cieca".
 */
export async function GET(request: Request, { params }: Params) {
  const { ctx, edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  const perms = cassaPermissions(ctx, edition);
  if (!perms.openClose && !perms.viewTotals) return forbidden();
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
        expectedCashCents: perms.viewTotals ? s.expectedCashCents : null,
        zReportNumber: s.session.zReportNumber,
        totals: perms.viewTotals ? s.totals : null,
      },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/** Chiusura Z: conteggio per taglio e nota. Senza pos.view_totals la risposta non dice l'atteso. */
export async function POST(request: Request, { params }: Params) {
  const { ctx, edition, denied } = await cassaAccess(request, 'pos.open_close_session');
  if (denied) return denied;
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const closed = await closeSession(ctx, { ...body, sessionId: (await params).id } as never);
    const visible = cassaPermissions(ctx, edition).viewTotals ? closed : { ...closed, expectedCashCents: null, differenceCents: null };
    return NextResponse.json(visible, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
