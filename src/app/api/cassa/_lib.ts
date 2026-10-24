import 'server-only';
import { NextResponse } from 'next/server';
import { getAdminCtx, getFieldCtx, touchPinSession } from '@/server/auth/context';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { toErrorBody } from '@/server/domain/errors';
import { log } from '@/server/log';

// Comune alle rotte della nuova cassa (/api/cassa/*), usate dai dispositivi (§4: le API servono ai dispositivi).

export type CassaAccess = { ctx: Ctx; edition: string; denied: null } | { ctx: null; edition: null; denied: NextResponse };

const json = (status: number, error: string, code: string) => NextResponse.json({ code, error }, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Chi usa la cassa: un dispositivo di cassa abbinato con il PIN di un volontario (l'edizione è quella
 * del dispositivo), oppure un utente dell'admin con il permesso sull'edizione indicata in `?edizione=`.
 * Rinnova la sessione PIN (30 minuti di inattività, §8.1).
 */
export async function cassaAccess(request: Request, permission: Permission = 'pos.sell'): Promise<CassaAccess> {
  const field = await getFieldCtx();
  if (field?.device) {
    if (field.device.kind !== 'pos') return { ctx: null, edition: null, denied: json(403, 'Questo dispositivo è abbinato allo scanner.', 'FORBIDDEN') };
    if (!can(field, permission, { edition: field.device.edition })) return { ctx: null, edition: null, denied: json(403, 'Non hai i permessi per questa operazione.', 'FORBIDDEN') };
    await touchPinSession(field);
    return { ctx: field, edition: field.device.edition, denied: null };
  }
  const admin = await getAdminCtx();
  const edition = new URL(request.url).searchParams.get('edizione');
  if (admin && edition && can(admin, permission, { edition })) return { ctx: admin, edition, denied: null };
  if (admin) return { ctx: null, edition: null, denied: json(403, 'Non hai i permessi per questa operazione.', 'FORBIDDEN') };
  return { ctx: null, edition: null, denied: json(401, 'Accedi con il tuo PIN per continuare.', 'UNAUTHORIZED') };
}

/** Cosa può fare chi usa la cassa, per nascondere i pulsanti (il server lo rifiuta comunque). */
export function cassaPermissions(ctx: Ctx, edition: string) {
  const has = (p: Permission) => can(ctx, p, { edition });
  return {
    openAmount: has('pos.open_amount'),
    complimentary: has('pos.complimentary'),
    // Annullo senza PIN di un responsabile: dall'admin con pos.void, sul telefono solo se concesso al dispositivo.
    voidWithoutPin: has('pos.void') && (!ctx.device || !!ctx.permissions?.some((p) => p.permission === 'pos.void')),
    openClose: has('pos.open_close_session'),
    viewTotals: has('pos.view_totals'),
    reprint: has('pos.reprint'),
  };
}

/** Un dispositivo con la cassa assegnata non legge listini di altre casse. */
export function wrongRegister(ctx: Ctx, registerId: string): NextResponse | null {
  return ctx.device?.registerId && ctx.device.registerId !== registerId ? json(403, 'Questo dispositivo lavora su un’altra cassa.', 'FORBIDDEN') : null;
}

/** «Altro» spento nel listino se chi usa la cassa non ha il permesso. */
export function catalogFor<T extends { openPrice?: { available: boolean; maxCents: number } }>(ctx: Ctx, edition: string, catalog: T): T {
  if (!catalog.openPrice || can(ctx, 'pos.open_amount', { edition })) return catalog;
  return { ...catalog, openPrice: { ...catalog.openPrice, available: false } };
}

/** Errore di dominio o di validazione → JSON con codice e messaggio in italiano. */
export function errorResponse(error: unknown): NextResponse {
  if (error && typeof error === 'object' && 'issues' in error) {
    const first = (error as { issues: Array<{ message: string }> }).issues[0];
    return json(400, first?.message ?? 'Alcuni dati non sono validi.', 'VALIDATION');
  }
  const { status, body } = toErrorBody(error);
  if (status >= 500) log.error('Errore nelle rotte della cassa', { error });
  return json(status, body.error, body.code);
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}

export const noStore = { 'Cache-Control': 'no-store' };
