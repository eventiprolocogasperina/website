import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { signToken, verifyToken, type SessionPayload } from './token';

// Soluzione ponte (prompt 02): un solo account amministratore e le sessioni di cassa
// aperte con il codice evento. Il prompt 07 sostituisce l'account unico con utenti e ruoli
// mantenendo queste funzioni come punto di ingresso.

export const ADMIN_COOKIE = 'pl_admin';
export const CASSA_COOKIE = 'pl_cassa';
const ADMIN_TTL_S = 12 * 60 * 60;
const CASSA_TTL_S = 16 * 60 * 60;

const secret = () => process.env.AUTH_SECRET || '';

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export async function createSession(payload: Omit<SessionPayload, 'exp'>) {
  const isCassa = payload.role === 'cassa';
  const ttl = isCassa ? CASSA_TTL_S : ADMIN_TTL_S;
  const token = signToken({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }, secret());
  (await cookies()).set(isCassa ? CASSA_COOKIE : ADMIN_COOKIE, token, cookieOptions(ttl));
}

export async function readSession(role: SessionPayload['role'] = 'admin'): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = verifyToken(store.get(role === 'cassa' ? CASSA_COOKIE : ADMIN_COOKIE)?.value, secret());
  return session && session.role === role ? session : null;
}

export async function destroySession(role: SessionPayload['role'] = 'admin') {
  (await cookies()).delete(role === 'cassa' ? CASSA_COOKIE : ADMIN_COOKIE);
}

const unauthorized = () => NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

/**
 * Da chiamare in cima a ogni route handler protetto:
 *   const denied = await requireAdmin(); if (denied) return denied;
 * Restituisce una risposta 401 se manca una sessione admin valida, altrimenti null.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  return (await readSession('admin')) ? null : unauthorized();
}

/**
 * Per le rotte di cassa: vale una sessione admin oppure una sessione di cassa aperta con il
 * codice evento. Se la rotta riguarda un evento preciso, la sessione di cassa deve essere
 * di quell'evento. Restituisce { denied } oppure { eventId } della sessione di cassa.
 */
export async function requireCassaOrAdmin(eventId?: string | null): Promise<{ denied: NextResponse | null; cassaEventId?: string }> {
  if (await readSession('admin')) return { denied: null };
  const cassa = await readSession('cassa');
  if (!cassa) return { denied: unauthorized() };
  if (eventId && cassa.eventId !== eventId) return { denied: unauthorized() };
  return { denied: null, cassaEventId: cassa.eventId };
}
