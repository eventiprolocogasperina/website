import 'server-only';
import { NextResponse } from 'next/server';
import { requireCheckin } from '@/server/auth/context';
import type { Ctx } from '@/server/auth/context-shared';
import type { Permission } from '@/server/auth/permissions';
import { isDomainError } from '@/server/domain/errors';
import { log } from '@/server/log';

/**
 * Corpo comune delle rotte dello scanner nuovo (§16: i dispositivi usano route handler):
 * admin con il permesso oppure dispositivo scanner + PIN, errori di dominio in italiano.
 * Mai dati personali nei log: solo l'errore.
 */
export async function scannerRoute(permission: Permission, fn: (ctx: Ctx, edition: string | null) => Promise<unknown>): Promise<NextResponse> {
  const access = await requireCheckin(permission);
  if (access.denied) return access.denied;
  const started = performance.now();
  try {
    const data = await fn(access.ctx!, access.edition ?? null);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store', 'Server-Timing': `app;dur=${Math.round(performance.now() - started)}` } });
  } catch (error) {
    if (isDomainError(error)) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    if (error && typeof error === 'object' && 'issues' in error) return NextResponse.json({ error: 'Richiesta non valida.', code: 'VALIDATION' }, { status: 400 });
    log.error('Scanner: richiesta non riuscita', { error });
    return NextResponse.json({ error: 'Si è verificato un errore. Riprova.', code: 'INTERNAL' }, { status: 500 });
  }
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  const data = await request.json().catch(() => null);
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

export const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
