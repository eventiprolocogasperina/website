'use server';

import { revalidatePath } from 'next/cache';
import { getAdminCtx } from '@/server/auth/context';
import { isDomainError } from '@/server/domain/errors';
import { setOwnPin } from '@/server/domain/users';
import { log } from '@/server/log';

export async function setOwnPinAction(pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getAdminCtx();
  if (!ctx) return { ok: false, error: 'La sessione è scaduta. Accedi di nuovo.' };
  try {
    await setOwnPin(ctx, pin);
    revalidatePath('/admin/profilo');
    return { ok: true };
  } catch (error) {
    if (isDomainError(error)) return { ok: false, error: error.message };
    log.error('PIN personale non salvato', { error });
    return { ok: false, error: 'Si è verificato un errore. Riprova tra poco.' };
  }
}
