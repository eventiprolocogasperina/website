import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { getDb } from '@/server/db/client';
import { devices, roleAssignments, siteSettings, userSessions, users } from '@/server/db/schema';
import { log } from '@/server/log';
import type { Ctx, CtxDevice, CtxUser } from './context-shared';
import { hashToken } from './password';
import { can, type Permission, type PermissionScope, type RoleGrant } from './permissions';
import { DEVICE_COOKIE, PIN_COOKIE, PIN_IDLE_S, cookieOptions, readSession } from './session';
import { signToken, verifyToken } from './token';

export type { Ctx } from './context-shared';

const secret = () => process.env.AUTH_SECRET || '';

/** L'accesso di emergenza con ADMIN_PASSWORD_HASH vale solo con ALLOW_LEGACY_ADMIN=true. */
export const legacyAdminAllowed = () => process.env.ALLOW_LEGACY_ADMIN === 'true';

export async function requestIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null;
  // inet accetta solo indirizzi validi: meglio nessun IP che un errore di scrittura.
  return ip && /^[0-9a-f.:]+$/i.test(ip) ? ip : null;
}

async function loadUser(userId: string): Promise<{ user: CtxUser; grants: RoleGrant[] } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.active, true)));
  if (!row) return null;
  const roles = await db.select({ role: roleAssignments.role, edition: roleAssignments.editionSlug }).from(roleAssignments).where(eq(roleAssignments.userId, userId));
  return { user: row, grants: roles };
}

/**
 * Chi sta usando l'admin, una volta per richiesta. null se non c'è una sessione valida:
 * cookie mancante o falsificato, sessione chiusa o scaduta, utente disattivato.
 */
export const getAdminCtx = cache(async (): Promise<Ctx | null> => {
  const session = await readSession('admin');
  if (!session) return null;
  const ip = await requestIp();

  if (session.sub === 'admin' && !session.sid) {
    return legacyAdminAllowed() ? { user: null, device: null, legacy: true, grants: [{ role: 'owner', edition: null }], ip } : null;
  }
  if (!session.sid) return null;

  try {
    const [open] = await getDb()
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(and(eq(userSessions.id, session.sid), eq(userSessions.userId, session.sub), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date())));
    if (!open) return null;
    const loaded = await loadUser(session.sub);
    return loaded ? { ...loaded, device: null, legacy: false, ip } : null;
  } catch (error) {
    log.error('Impossibile leggere la sessione admin', { error });
    return null;
  }
});

/** Il dispositivo abbinato su cui gira questa richiesta (cookie pl_device), se non è stato revocato. */
export const getDevice = cache(async (): Promise<CtxDevice | null> => {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb()
    .select({ id: devices.id, name: devices.name, edition: devices.editionSlug, kind: devices.kind })
    .from(devices)
    .where(and(eq(devices.tokenHash, hashToken(token)), isNull(devices.revokedAt)));
  return row ?? null;
});

/**
 * Volontario entrato con il PIN su un dispositivo abbinato. I suoi ruoli valgono solo
 * sull'edizione del dispositivo, qualunque sia l'ambito con cui sono stati assegnati.
 */
export const getFieldCtx = cache(async (): Promise<Ctx | null> => {
  const device = await getDevice();
  if (!device) return null;
  const pin = verifyToken((await cookies()).get(PIN_COOKIE)?.value, secret());
  if (!pin || pin.role !== 'pin' || pin.did !== device.id) return null;
  const loaded = await loadUser(pin.sub);
  if (!loaded) return null;
  const grants = loaded.grants.filter((g) => g.edition === null || g.edition === device.edition).map((g) => ({ role: g.role, edition: device.edition }));
  return { user: loaded.user, device, legacy: false, grants, ip: await requestIp() };
});

/** Rinnova la sessione PIN (30 minuti dall'ultima attività). Solo nei route handler. */
export async function touchPinSession(ctx: Ctx) {
  if (!ctx.user || !ctx.device) return;
  const token = signToken({ sub: ctx.user.id, role: 'pin', did: ctx.device.id, exp: Math.floor(Date.now() / 1000) + PIN_IDLE_S }, secret());
  try {
    (await cookies()).set(PIN_COOKIE, token, cookieOptions(PIN_IDLE_S));
  } catch {
    // In un componente server i cookie sono in sola lettura: si rinnova alla prossima chiamata API.
  }
}

const unauthorized = () => NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
const forbidden = () => NextResponse.json({ error: 'Non hai i permessi per questa operazione' }, { status: 403 });

export type Authorized = { ctx: Ctx; denied: null } | { ctx: null; denied: NextResponse };

/**
 * Per i route handler dell'admin:
 *   const { ctx, denied } = await authorize('orders.read'); if (denied) return denied;
 * 401 senza sessione, 403 senza il permesso.
 */
export async function authorize(permission: Permission, scope: PermissionScope = {}): Promise<Authorized> {
  const ctx = await getAdminCtx();
  if (!ctx) return { ctx: null, denied: unauthorized() };
  if (!can(ctx, permission, scope)) return { ctx: null, denied: forbidden() };
  return { ctx, denied: null };
}

/** Come authorize, quando non serve il contesto: `const denied = await requirePermission('…'); if (denied) return denied;` */
export async function requirePermission(permission: Permission, scope: PermissionScope = {}): Promise<NextResponse | null> {
  return (await authorize(permission, scope)).denied;
}

/** Basta uno dei permessi indicati (es. lettura di una risorsa usata da più sezioni). */
export async function requireAnyPermission(permissions: Permission[], scope: PermissionScope = {}): Promise<NextResponse | null> {
  const ctx = await getAdminCtx();
  if (!ctx) return unauthorized();
  return permissions.some((p) => can(ctx, p, scope)) ? null : forbidden();
}

/** Basta essere entrati: nell'admin oppure con il PIN su un dispositivo (es. i manuali PDF). */
export async function requireSignedIn(): Promise<NextResponse | null> {
  if (await getAdminCtx()) return null;
  if (await getFieldCtx()) return null;
  return unauthorized();
}

/** Il codice evento della cassa (vecchio sistema) è ancora accettato? Si spegne da Impostazioni (site_settings). */
export const legacyEventCodeEnabled = cache(async (): Promise<boolean> => {
  try {
    const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, 'legacy_event_code'));
    return row?.value !== 'false';
  } catch {
    return true;
  }
});

/** true se il dispositivo (edizione) e il vecchio eventId della cassa o del biglietto sono la stessa edizione. */
export async function sameEdition(edition: string, legacyEventId: string): Promise<boolean> {
  const { sameEdition: same } = await import('@/server/domain/editions');
  return same(edition, legacyEventId);
}

/** L'evento della configurazione di cassa che corrisponde all'edizione del dispositivo. */
async function cashierEventIdFor(edition: string): Promise<string> {
  const { legacyIdsFor } = await import('@/server/domain/editions');
  const ids = await legacyIdsFor(edition);
  try {
    const { getCashierConfig } = await import('@/lib/data/cashier');
    const match = (await getCashierConfig()).events.find((e) => ids.includes(e.id));
    if (match) return match.id;
  } catch (error) {
    log.error('Configurazione della cassa illeggibile', { error });
  }
  return ids[0];
}

export type FieldAccess = { denied: NextResponse | null; ctx?: Ctx | null; cassaEventId?: string; edition?: string };

/**
 * Rotte della cassa. Valgono, in quest'ordine:
 * 1. una sessione admin con pos.sell (sull'edizione dell'evento, se indicato);
 * 2. un dispositivo di cassa abbinato più il PIN di un utente con pos.sell su quell'edizione;
 * 3. la sessione aperta con il codice evento, finché il flag legacy_event_code è acceso.
 * cassaEventId limita i dati all'evento della sessione di campo.
 */
export async function requirePos(eventId?: string | null, permission: Permission = 'pos.sell'): Promise<FieldAccess> {
  const admin = await getAdminCtx();
  if (admin) {
    const { editionSlugForLegacyId } = await import('@/server/domain/editions');
    const edition = eventId ? await editionSlugForLegacyId(eventId) : null;
    if (can(admin, permission, { edition })) return { denied: null, ctx: admin };
  }

  const field = await getFieldCtx();
  if (field?.device?.kind === 'pos' && can(field, permission, { edition: field.device.edition })) {
    if (eventId && !(await sameEdition(field.device.edition, eventId))) return { denied: forbidden() };
    await touchPinSession(field);
    return { denied: null, ctx: field, cassaEventId: eventId ?? (await cashierEventIdFor(field.device.edition)), edition: field.device.edition };
  }

  if (await legacyEventCodeEnabled()) {
    const cassa = await readSession('cassa');
    if (cassa) {
      if (eventId && cassa.eventId !== eventId) return { denied: unauthorized() };
      return { denied: null, cassaEventId: cassa.eventId };
    }
  }
  return { denied: admin ? forbidden() : unauthorized() };
}

/** Rotte dello scanner: admin con il permesso, oppure dispositivo scanner abbinato più PIN. */
export async function requireCheckin(permission: Permission = 'checkin.scan'): Promise<FieldAccess> {
  const admin = await getAdminCtx();
  if (admin && can(admin, permission)) return { denied: null, ctx: admin };

  const field = await getFieldCtx();
  if (field?.device?.kind === 'scanner' && can(field, permission, { edition: field.device.edition })) {
    await touchPinSession(field);
    return { denied: null, ctx: field, edition: field.device.edition };
  }
  return { denied: admin ? forbidden() : unauthorized() };
}
