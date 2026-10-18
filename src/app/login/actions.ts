'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSession } from '@/server/auth/session';
import { verifyPassword } from '@/server/auth/password';
import { clearFailures, isRateLimited, recordFailure } from '@/server/auth/rateLimit';

export type LoginState = { error?: string };

/** Solo percorsi interni dell'admin, per evitare redirect verso altri siti. */
function safeNext(next: unknown): string {
  return typeof next === 'string' && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'sconosciuto';
  const key = `login:${ip}`;

  if (isRateLimited(key)) {
    return { error: 'Troppi tentativi. Riprova tra qualche minuto.' };
  }

  const password = String(formData.get('password') ?? '');
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash || !process.env.AUTH_SECRET) {
    console.error('login: ADMIN_PASSWORD_HASH o AUTH_SECRET non impostati');
    return { error: 'Accesso non disponibile. Contatta l’amministratore del sito.' };
  }

  if (!verifyPassword(password, hash)) {
    recordFailure(key);
    return { error: 'Password non corretta. Riprova.' };
  }

  clearFailures(key);
  await createSession({ sub: 'admin', role: 'admin' });
  redirect(safeNext(formData.get('next')));
}
