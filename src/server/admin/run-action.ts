import 'server-only';
import { revalidatePath } from 'next/cache';
import { getAdminCtx } from '@/server/auth/context';
import type { Ctx } from '@/server/auth/context-shared';
import { isDomainError } from '@/server/domain/errors';
import { log } from '@/server/log';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Corpo comune delle Server Action dell'admin: sessione, servizio di dominio, errori in italiano.
 * `revalidate` sono i percorsi da aggiornare dopo una scrittura riuscita.
 */
export async function runAction<T>(revalidate: string[], fn: (ctx: Ctx) => Promise<T>): Promise<ActionResult<T>> {
  const ctx = await getAdminCtx();
  if (!ctx) return { ok: false, error: 'La sessione è scaduta. Accedi di nuovo.' };
  try {
    const data = await fn(ctx);
    for (const path of revalidate) revalidatePath(path, 'layout');
    return { ok: true, data };
  } catch (error) {
    if (isDomainError(error)) return { ok: false, error: error.message };
    if (error && typeof error === 'object' && 'issues' in error) {
      const first = (error as { issues: Array<{ message: string }> }).issues[0];
      return { ok: false, error: first?.message ?? 'Alcuni dati non sono validi.' };
    }
    log.error('Azione dell’admin non riuscita', { error });
    return { ok: false, error: 'Si è verificato un errore. Riprova tra poco.' };
  }
}
