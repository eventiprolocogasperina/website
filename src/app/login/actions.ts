'use server';

import { redirect } from 'next/navigation';
import { legacyAdminAllowed, requestIp } from '@/server/auth/context';
import { verifyPassword } from '@/server/auth/password';
import { clearFailures, isRateLimited, recordFailure } from '@/server/auth/rateLimit';
import { createSession, createUserSession } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { audit } from '@/server/domain/audit';
import { isDomainError } from '@/server/domain/errors';
import { authenticateWithPassword, requestPasswordReset, setPasswordWithLink } from '@/server/domain/users';
import { log } from '@/server/log';

export type LoginState = { error?: string; email?: string };

/** Solo percorsi interni dell'admin e dello scanner, per evitare redirect verso altri siti. */
function safeNext(next: unknown): string {
  if (typeof next !== 'string' || next.startsWith('//')) return '/admin';
  return /^\/(admin|scanner)(\/|\?|$)/.test(next) ? next : '/admin';
}

const anonymous = (ip: string | null) => ({ user: null, device: null, legacy: false, grants: [], ip });

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await requestIp();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const ipKey = `login:${ip ?? 'sconosciuto'}`;
  const emailKey = `login-email:${email}`;

  if (isRateLimited(ipKey, 10) || (email && isRateLimited(emailKey))) {
    return { error: 'Troppi tentativi. Riprova tra qualche minuto.', email };
  }
  if (!process.env.AUTH_SECRET) {
    log.error('login: AUTH_SECRET non impostato');
    return { error: 'Accesso non disponibile. Contatta l’amministratore del sito.', email };
  }

  // Accesso di emergenza con la vecchia password unica: solo con ALLOW_LEGACY_ADMIN=true e senza email.
  if (!email) {
    if (legacyAdminAllowed() && verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
      clearFailures(ipKey);
      await createSession({ sub: 'admin', role: 'admin' });
      await audit(getDb(), { ...anonymous(ip), legacy: true }, 'auth.legacy_login');
      redirect(safeNext(formData.get('next')));
    }
    recordFailure(ipKey);
    return { error: 'Scrivi la tua email.', email };
  }

  const { user, userId } = await authenticateWithPassword(email, password);
  if (!user) {
    recordFailure(ipKey);
    recordFailure(emailKey);
    await audit(getDb(), anonymous(ip), 'auth.login_failed', userId ? { entityType: 'user', entityId: userId } : {});
    return { error: 'Email o password non corrette.', email };
  }

  clearFailures(ipKey);
  clearFailures(emailKey);
  await createUserSession(user.id, ip);
  await audit(getDb(), { ...anonymous(ip), user }, 'auth.login', { entityType: 'user', entityId: user.id });
  redirect(safeNext(formData.get('next')));
}

export type ForgotState = { sent?: boolean; error?: string };

export async function forgotPassword(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const ip = await requestIp();
  const key = `reset:${ip ?? 'sconosciuto'}`;
  if (isRateLimited(key, 5, 60 * 60 * 1000)) return { error: 'Troppe richieste. Riprova tra un’ora.' };
  recordFailure(key);
  const email = String(formData.get('email') ?? '').trim();
  if (!email.includes('@')) return { error: 'Scrivi un’email valida.' };
  try {
    await requestPasswordReset(email, ip);
  } catch (error) {
    log.error('Richiesta di nuova password non riuscita', { error });
  }
  // Stessa risposta che l'email esista o no.
  return { sent: true };
}

export type NewPasswordState = { error?: string };

export async function setNewPassword(_prev: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const password = String(formData.get('password') ?? '');
  if (password !== String(formData.get('confirm') ?? '')) return { error: 'Le due password non coincidono.' };
  try {
    await setPasswordWithLink(String(formData.get('token') ?? ''), password, await requestIp());
  } catch (error) {
    if (isDomainError(error)) return { error: error.message };
    log.error('Impostazione della password non riuscita', { error });
    return { error: 'Non è stato possibile salvare la password. Riprova.' };
  }
  redirect('/login?password=ok');
}
