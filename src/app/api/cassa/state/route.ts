import { NextResponse } from 'next/server';
import { can } from '@/server/auth/permissions';
import { listDepartments } from '@/server/domain/cash/departments';
import { listRegisters } from '@/server/domain/cash/registers';
import { openSessionOf } from '@/server/domain/cash/sessions';
import { listManagers } from '@/server/domain/cash/void';
import { getEditionDetail } from '@/server/domain/editions';
import { cassaAccess, errorResponse, noStore } from '../_lib';

export const dynamic = 'force-dynamic';

/** Stato iniziale dell'app /cassa: casse attive con il loro turno aperto, reparti, responsabili per l'annullo. */
export async function GET(request: Request) {
  const { ctx, edition, denied } = await cassaAccess(request);
  if (denied) return denied;
  try {
    const e = await getEditionDetail(edition);
    if (!e) return NextResponse.json({ code: 'NOT_FOUND', error: 'Edizione non trovata.' }, { status: 404 });
    const registers = await listRegisters(e.id, { activeOnly: true });
    const sessions = await Promise.all(registers.map((r) => openSessionOf(r.id)));
    return NextResponse.json(
      {
        edition: { slug: e.slug, title: e.title, status: e.status, departments: e.enabledModules.includes('departments') },
        user: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : null,
        device: ctx.device ? { name: ctx.device.name } : null,
        canClose: can(ctx, 'pos.open_close_session', { edition }),
        registers: registers.map((r, i) => ({
          id: r.id,
          name: r.name,
          openSession: sessions[i] ? { id: sessions[i]!.id, openedAt: sessions[i]!.openedAt.toISOString(), openingFloatCents: sessions[i]!.openingFloatCents } : null,
        })),
        departments: e.enabledModules.includes('departments') ? await listDepartments(e.id) : [],
        managers: await listManagers(edition),
      },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
