'use server';

import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { getAdminCtx } from '@/server/auth/context';
import { createPairing, revokeDevice } from '@/server/domain/devices';
import { isDomainError } from '@/server/domain/errors';
import { createUser, sendInvite, setUserActive, setUserPin, updateUser, type UserInput } from '@/server/domain/users';
import { siteUrl } from '@/server/email/send';
import { log } from '@/server/log';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: (ctx: NonNullable<Awaited<ReturnType<typeof getAdminCtx>>>) => Promise<T>): Promise<ActionResult<T>> {
  const ctx = await getAdminCtx();
  if (!ctx) return { ok: false, error: 'La sessione è scaduta. Accedi di nuovo.' };
  try {
    const data = await fn(ctx);
    revalidatePath('/admin/sistema/utenti');
    return { ok: true, data };
  } catch (error) {
    if (isDomainError(error)) return { ok: false, error: error.message };
    if (error && typeof error === 'object' && 'issues' in error) {
      const first = (error as { issues: Array<{ message: string }> }).issues[0];
      return { ok: false, error: first?.message ?? 'Alcuni dati non sono validi.' };
    }
    log.error('Azione sugli utenti non riuscita', { error });
    return { ok: false, error: 'Si è verificato un errore. Riprova tra poco.' };
  }
}

export async function createUserAction(input: UserInput, invite: boolean) {
  return run((ctx) => createUser(ctx, input, { invite }));
}

export async function updateUserAction(userId: string, input: UserInput) {
  return run((ctx) => updateUser(ctx, userId, input));
}

export async function setPinAction(userId: string, pin: string) {
  return run((ctx) => setUserPin(ctx, userId, pin));
}

export async function setActiveAction(userId: string, active: boolean) {
  return run((ctx) => setUserActive(ctx, userId, active));
}

export async function sendInviteAction(userId: string) {
  return run(async (ctx) => {
    if (!(await sendInvite(ctx, userId))) throw new Error('invio non riuscito');
  });
}

export async function createPairingAction(input: { name: string; edition: string; kind: 'pos' | 'scanner' }) {
  return run(async (ctx) => {
    const { token, expiresAt } = await createPairing(ctx, input);
    const url = `${siteUrl()}/abbina/${token}`;
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 280 });
    return { url, qr, expiresAt };
  });
}

export async function revokeDeviceAction(deviceId: string) {
  return run((ctx) => revokeDevice(ctx, deviceId));
}
