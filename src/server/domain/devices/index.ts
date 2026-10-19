import 'server-only';
import { and, asc, desc, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx, CtxDevice } from '@/server/auth/context-shared';
import { hashToken, randomToken, verifyPassword } from '@/server/auth/password';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { devicePairings, devices, roleAssignments, users } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { MAX_PIN_ATTEMPTS } from '@/server/domain/users';

const PAIRING_TTL_MS = 10 * 60 * 1000;

/** Chi gestisce i dispositivi: titolare e amministratori (§8.3, settings.manage). */
function assertCanManage(ctx: Ctx) {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
}

export const PairingInput = z.object({
  name: z.string().trim().min(2, 'Dai un nome al dispositivo, es. “Cassa 1”.').max(60),
  edition: z.string().trim().min(1, 'Scegli l’edizione.').max(80),
  kind: z.enum(['pos', 'scanner']),
});

export type DeviceRow = {
  id: string;
  name: string;
  edition: string;
  kind: 'pos' | 'scanner';
  pairedBy: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export async function listDevices(ctx: Ctx): Promise<DeviceRow[]> {
  assertCanManage(ctx);
  const rows = await getDb()
    .select({ d: devices, by: users.name })
    .from(devices)
    .leftJoin(users, eq(users.id, devices.pairedBy))
    .orderBy(asc(devices.revokedAt), desc(devices.createdAt));
  return rows.map(({ d, by }) => ({
    id: d.id,
    name: d.name,
    edition: d.editionSlug,
    kind: d.kind,
    pairedBy: by,
    createdAt: d.createdAt.toISOString(),
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    revokedAt: d.revokedAt?.toISOString() ?? null,
  }));
}

/** Crea il QR di abbinamento: monouso, valido 10 minuti. Restituisce il token in chiaro una sola volta. */
export async function createPairing(ctx: Ctx, input: z.input<typeof PairingInput>): Promise<{ token: string; expiresAt: string }> {
  assertCanManage(ctx);
  const data = PairingInput.parse(input);
  const token = randomToken();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);
  await withTransaction(async (tx) => {
    const [row] = await tx
      .insert(devicePairings)
      .values({ tokenHash: hashToken(token), name: data.name, editionSlug: data.edition, kind: data.kind, createdBy: ctx.user?.id ?? null, expiresAt })
      .returning({ id: devicePairings.id });
    await audit(tx, ctx, 'device.pairing_created', { entityType: 'device_pairing', entityId: row.id, edition: data.edition, after: data });
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

/** Il QR è ancora valido? Per mostrare la pagina di conferma sul telefono. */
export async function checkPairing(token: string) {
  const [row] = await getDb()
    .select({ name: devicePairings.name, edition: devicePairings.editionSlug, kind: devicePairings.kind })
    .from(devicePairings)
    .where(and(eq(devicePairings.tokenHash, hashToken(token)), isNull(devicePairings.usedAt), gt(devicePairings.expiresAt, new Date())));
  return row ?? null;
}

/**
 * Usa il QR: crea il dispositivo e restituisce il suo token, da salvare nel cookie httpOnly.
 * Se il telefono aveva già un dispositivo, quello viene revocato.
 */
export async function completePairing(token: string, ip: string | null, previousDeviceToken?: string): Promise<{ deviceToken: string; device: CtxDevice }> {
  return withTransaction(async (tx) => {
    const [pairing] = await tx
      .select()
      .from(devicePairings)
      .where(and(eq(devicePairings.tokenHash, hashToken(token)), isNull(devicePairings.usedAt), gt(devicePairings.expiresAt, new Date())))
      .for('update');
    if (!pairing) throw new DomainError('VALIDATION', { message: 'Il QR non è valido o è scaduto. Chiedi di generarne uno nuovo.' });

    const deviceToken = randomToken();
    const [device] = await tx
      .insert(devices)
      .values({ name: pairing.name, tokenHash: hashToken(deviceToken), editionSlug: pairing.editionSlug, kind: pairing.kind, pairedBy: pairing.createdBy })
      .returning();
    await tx.update(devicePairings).set({ usedAt: new Date(), deviceId: device.id, updatedAt: new Date() }).where(eq(devicePairings.id, pairing.id));
    if (previousDeviceToken) {
      await tx.update(devices).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(devices.tokenHash, hashToken(previousDeviceToken)), isNull(devices.revokedAt)));
    }
    const ctxDevice: CtxDevice = { id: device.id, name: device.name, edition: device.editionSlug, kind: device.kind };
    const [creator] = pairing.createdBy ? await tx.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, pairing.createdBy)) : [];
    await audit(tx, { user: creator ?? null, device: ctxDevice, legacy: false, grants: [], ip }, 'device.paired', {
      entityType: 'device',
      entityId: device.id,
      edition: device.editionSlug,
      after: { name: device.name, kind: device.kind },
    });
    return { deviceToken, device: ctxDevice };
  });
}

export async function revokeDevice(ctx: Ctx, deviceId: string): Promise<void> {
  assertCanManage(ctx);
  await withTransaction(async (tx) => {
    const [row] = await tx
      .update(devices)
      .set({ revokedAt: new Date(), revokedBy: ctx.user?.id ?? null, updatedAt: new Date() })
      .where(and(eq(devices.id, deviceId), isNull(devices.revokedAt)))
      .returning();
    if (!row) throw new DomainError('NOT_FOUND', { message: 'Dispositivo non trovato o già revocato.' });
    await audit(tx, ctx, 'device.revoked', { entityType: 'device', entityId: row.id, edition: row.editionSlug, before: { name: row.name } });
  });
}

// ─── PIN sul dispositivo ─────────────────────────────────────────────────────

const FIELD_ROLES = { pos: ['cashier', 'event_manager', 'admin', 'owner'], scanner: ['gate', 'event_manager', 'admin', 'owner'] } as const;

/** Chi può entrare con il PIN su questo dispositivo: utenti attivi, con PIN, con un ruolo adatto sull'edizione. */
export async function listFieldUsers(device: CtxDevice): Promise<Array<{ id: string; name: string }>> {
  const rows = await getDb()
    .selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(roleAssignments, eq(roleAssignments.userId, users.id))
    .where(
      and(
        eq(users.active, true),
        isNull(users.pinLockedAt),
        inArray(roleAssignments.role, [...FIELD_ROLES[device.kind]]),
        or(isNull(roleAssignments.editionSlug), eq(roleAssignments.editionSlug, device.edition)),
      ),
    )
    .orderBy(asc(users.name));
  // Solo chi ha un PIN impostato: la colonna non si espone, si filtra qui.
  const withPin = rows.length ? await getDb().select({ id: users.id, pin: users.pinHash }).from(users).where(inArray(users.id, rows.map((r) => r.id))) : [];
  const has = new Set(withPin.filter((r) => r.pin).map((r) => r.id));
  return rows.filter((r) => has.has(r.id));
}

export type PinResult = { ok: true; user: { id: string; name: string } } | { ok: false; error: string; locked?: boolean };

/** Controlla il PIN. Dopo 5 errori consecutivi il PIN si blocca finché un responsabile non lo reimposta. */
export async function verifyFieldPin(device: CtxDevice, userId: string, pin: string, ip: string | null): Promise<PinResult> {
  const allowed = await listFieldUsers(device);
  if (!allowed.some((u) => u.id === userId)) return { ok: false, error: 'Questo utente non può entrare su questo dispositivo.' };

  return withTransaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    const ctxBase = { device, legacy: false, grants: [], ip };
    if (!user || user.pinLockedAt) return { ok: false, error: 'PIN bloccato. Chiedi a un responsabile di reimpostarlo.', locked: true };
    const actor = { id: user.id, name: user.name, email: user.email };

    if (!verifyPassword(pin, user.pinHash ?? undefined)) {
      const attempts = user.pinFailedAttempts + 1;
      const locked = attempts >= MAX_PIN_ATTEMPTS;
      await tx.update(users).set({ pinFailedAttempts: attempts, pinLockedAt: locked ? new Date() : null }).where(eq(users.id, user.id));
      await audit(tx, { ...ctxBase, user: actor }, locked ? 'auth.pin_locked' : 'auth.pin_failed', { entityType: 'user', entityId: user.id, after: { tentativi: attempts } });
      const left = MAX_PIN_ATTEMPTS - attempts;
      return locked
        ? { ok: false, error: 'PIN bloccato dopo 5 tentativi. Chiedi a un responsabile di reimpostarlo.', locked: true }
        : { ok: false, error: left === 1 ? 'PIN sbagliato. Ti resta un tentativo.' : `PIN sbagliato. Ti restano ${left} tentativi.` };
    }

    await tx.update(users).set({ pinFailedAttempts: 0, lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await tx.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, device.id));
    await audit(tx, { ...ctxBase, user: actor }, 'auth.pin_login', { entityType: 'user', entityId: user.id });
    return { ok: true, user: { id: user.id, name: user.name } };
  });
}
