import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { getDb } from '@/server/db/client';
import { userSessions } from '@/server/db/schema';
import { signToken, verifyToken, type SessionPayload, type SessionRole } from './token';

// Cookie di sessione. I controlli dei permessi sono in context.ts (authorize, requirePos, requireCheckin).

export const ADMIN_COOKIE = 'pl_admin';
/** Sessione di cassa aperta con il codice evento (vecchio sistema, dietro il flag legacy_event_code). */
export const CASSA_COOKIE = 'pl_cassa';
/** Token del dispositivo abbinato (cassa o scanner): lungo, casuale, salvato solo come hash. */
export const DEVICE_COOKIE = 'pl_device';
/** Volontario entrato con il PIN sul dispositivo. */
export const PIN_COOKIE = 'pl_pin';

const ADMIN_TTL_S = 12 * 60 * 60;
const CASSA_TTL_S = 16 * 60 * 60;
export const PIN_IDLE_S = 30 * 60;
export const DEVICE_TTL_S = 400 * 24 * 60 * 60;

const COOKIE_BY_ROLE: Record<SessionRole, string> = { admin: ADMIN_COOKIE, cassa: CASSA_COOKIE, pin: PIN_COOKIE };

const secret = () => process.env.AUTH_SECRET || '';

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

/** Sessione di cassa con il codice evento, oppure l'accesso di emergenza dell'admin. */
export async function createSession(payload: Omit<SessionPayload, 'exp'>) {
  const ttl = payload.role === 'cassa' ? CASSA_TTL_S : payload.role === 'pin' ? PIN_IDLE_S : ADMIN_TTL_S;
  const token = signToken({ ...payload, exp: Math.floor(Date.now() / 1000) + ttl }, secret());
  (await cookies()).set(COOKIE_BY_ROLE[payload.role], token, cookieOptions(ttl));
}

/** Apre una sessione admin per un utente: una riga in user_sessions più il cookie firmato. */
export async function createUserSession(userId: string, ip: string | null) {
  const userAgent = (await headers()).get('user-agent')?.slice(0, 300) ?? null;
  const expiresAt = new Date(Date.now() + ADMIN_TTL_S * 1000);
  const [row] = await getDb().insert(userSessions).values({ userId, expiresAt, ip, userAgent }).returning({ id: userSessions.id });
  await createSession({ sub: userId, sid: row.id, role: 'admin' });
}

export async function readSession(role: SessionRole = 'admin'): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = verifyToken(store.get(COOKIE_BY_ROLE[role])?.value, secret());
  return session && session.role === role ? session : null;
}

/** Chiude la sessione: per l'admin anche sul server, così il cookie non vale più nemmeno se copiato. */
export async function destroySession(role: SessionRole = 'admin') {
  const session = await readSession(role);
  if (role === 'admin' && session?.sid) {
    await getDb().update(userSessions).set({ revokedAt: new Date(), updatedAt: new Date() }).where(eq(userSessions.id, session.sid));
  }
  (await cookies()).delete(COOKIE_BY_ROLE[role]);
}
