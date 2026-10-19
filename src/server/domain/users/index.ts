import 'server-only';
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { hashPassword, isValidPin, passwordFingerprint, passwordProblem, verifyPassword } from '@/server/auth/password';
import { can, type Permission, type RoleGrant } from '@/server/auth/permissions';
import { USER_ROLES } from '@/server/auth/roles';
import { signLinkToken, verifyLinkToken, type LinkPurpose } from '@/server/auth/token';
import { getDb, withTransaction } from '@/server/db/client';
import { roleAssignments, userSessions, users } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { actionEmail, sendEmail, siteUrl } from '@/server/email/send';

export const MAX_PIN_ATTEMPTS = 5;
const RESET_TTL_S = 30 * 60;
const INVITE_TTL_S = 7 * 24 * 60 * 60;

function assertCan(ctx: Ctx, permission: Permission) {
  if (!can(ctx, permission)) throw new DomainError('FORBIDDEN');
}

const secret = () => process.env.AUTH_SECRET || '';

export const RoleGrantInput = z.object({ role: z.enum(USER_ROLES), edition: z.string().trim().min(1).max(80).nullable() });
export const UserInput = z.object({
  name: z.string().trim().min(2, 'Scrivi nome e cognome.').max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Email non valida.')
    .transform((v) => v || null),
  roles: z.array(RoleGrantInput).max(30),
});
export type UserInput = z.input<typeof UserInput>;

export type UserRow = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  hasPassword: boolean;
  hasPin: boolean;
  pinLocked: boolean;
  lastLoginAt: string | null;
  roles: RoleGrant[];
};

export async function listUsers(ctx: Ctx): Promise<UserRow[]> {
  assertCan(ctx, 'users.manage');
  const db = getDb();
  const rows = await db.select().from(users).orderBy(asc(users.name));
  const roles = rows.length ? await db.select().from(roleAssignments).where(inArray(roleAssignments.userId, rows.map((r) => r.id))) : [];
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    active: u.active,
    hasPassword: !!u.passwordHash,
    hasPin: !!u.pinHash,
    pinLocked: !!u.pinLockedAt,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    roles: roles.filter((r) => r.userId === u.id).map((r) => ({ role: r.role, edition: r.editionSlug })),
  }));
}

function normalizeGrants(grants: RoleGrant[]): RoleGrant[] {
  const seen = new Set<string>();
  return grants.filter((g) => {
    // owner, admin ed editor valgono sempre su tutta l'associazione.
    const edition = ['owner', 'admin', 'editor'].includes(g.role) ? null : g.edition;
    const key = `${g.role}:${edition ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    g.edition = edition;
    return true;
  });
}

/** Deve restare almeno un titolare attivo, altrimenti nessuno può più gestire gli utenti. */
async function assertOwnerRemains(tx: Parameters<Parameters<typeof withTransaction>[0]>[0], exceptUserId: string) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(and(eq(roleAssignments.role, 'owner'), isNull(roleAssignments.editionSlug), eq(users.active, true), ne(users.id, exceptUserId)));
  if (row.n === 0) throw new DomainError('CONFLICT', { message: 'Deve restare almeno un titolare attivo.' });
}

export async function createUser(ctx: Ctx, input: UserInput, { invite = true } = {}): Promise<{ id: string; invited: boolean }> {
  assertCan(ctx, 'users.manage');
  const data = UserInput.parse(input);
  const roles = normalizeGrants(data.roles);
  const id = await withTransaction(async (tx) => {
    if (data.email) {
      const [dup] = await tx.select({ id: users.id }).from(users).where(eq(users.email, data.email));
      if (dup) throw new DomainError('CONFLICT', { message: 'Esiste già un utente con questa email.' });
    }
    const [row] = await tx.insert(users).values({ name: data.name, email: data.email }).returning({ id: users.id });
    if (roles.length) await tx.insert(roleAssignments).values(roles.map((r) => ({ userId: row.id, role: r.role, editionSlug: r.edition })));
    await audit(tx, ctx, 'user.created', { entityType: 'user', entityId: row.id, after: { name: data.name, email: data.email, roles } });
    return row.id;
  });
  const invited = invite && !!data.email ? await sendInvite(ctx, id) : false;
  return { id, invited };
}

export async function updateUser(ctx: Ctx, userId: string, input: UserInput): Promise<void> {
  assertCan(ctx, 'users.manage');
  const data = UserInput.parse(input);
  const roles = normalizeGrants(data.roles);
  await withTransaction(async (tx) => {
    const [before] = await tx.select().from(users).where(eq(users.id, userId));
    if (!before) throw new DomainError('NOT_FOUND');
    const beforeRoles = (await tx.select().from(roleAssignments).where(eq(roleAssignments.userId, userId))).map((r) => ({ role: r.role, edition: r.editionSlug }));
    if (data.email && data.email !== before.email) {
      const [dup] = await tx.select({ id: users.id }).from(users).where(and(eq(users.email, data.email), ne(users.id, userId)));
      if (dup) throw new DomainError('CONFLICT', { message: 'Esiste già un utente con questa email.' });
    }
    await tx.update(users).set({ name: data.name, email: data.email, updatedAt: new Date() }).where(eq(users.id, userId));
    if (before.name !== data.name || before.email !== data.email) {
      await audit(tx, ctx, 'user.updated', { entityType: 'user', entityId: userId, before: { name: before.name, email: before.email }, after: { name: data.name, email: data.email } });
    }
    const key = (rs: RoleGrant[]) => rs.map((r) => `${r.role}:${r.edition ?? ''}`).sort().join(',');
    if (key(beforeRoles) !== key(roles)) {
      await tx.delete(roleAssignments).where(eq(roleAssignments.userId, userId));
      if (roles.length) await tx.insert(roleAssignments).values(roles.map((r) => ({ userId, role: r.role, editionSlug: r.edition })));
      if (!roles.some((r) => r.role === 'owner' && r.edition === null)) await assertOwnerRemains(tx, userId);
      await audit(tx, ctx, 'user.roles_changed', { entityType: 'user', entityId: userId, before: beforeRoles, after: roles });
    }
  });
}

export async function setUserActive(ctx: Ctx, userId: string, active: boolean): Promise<void> {
  assertCan(ctx, 'users.manage');
  if (!active && ctx.user?.id === userId) throw new DomainError('CONFLICT', { message: 'Non puoi disattivare il tuo account.' });
  await withTransaction(async (tx) => {
    const [row] = await tx.update(users).set({ active, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id });
    if (!row) throw new DomainError('NOT_FOUND');
    if (!active) {
      await assertOwnerRemains(tx, userId);
      await tx.update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
    }
    await audit(tx, ctx, active ? 'user.reactivated' : 'user.deactivated', { entityType: 'user', entityId: userId });
  });
}

/** Imposta (o reimposta) il PIN e sblocca l'utente. */
export async function setUserPin(ctx: Ctx, userId: string, pin: string): Promise<void> {
  assertCan(ctx, 'users.manage');
  if (!isValidPin(pin)) throw new DomainError('VALIDATION', { message: 'Il PIN deve avere da 4 a 6 cifre.' });
  await withTransaction(async (tx) => {
    const [row] = await tx
      .update(users)
      .set({ pinHash: hashPassword(pin), pinFailedAttempts: 0, pinLockedAt: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!row) throw new DomainError('NOT_FOUND');
    await audit(tx, ctx, 'user.pin_set', { entityType: 'user', entityId: userId });
  });
}

// ─── Accesso con email e password ────────────────────────────────────────────

/** Utente attivo con queste credenziali, oppure null. Stesso tempo di risposta se l'email non esiste. */
export async function authenticateWithPassword(email: string, password: string) {
  const [row] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash, active: users.active })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()));
  const ok = verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
  if (!row || !row.active || !row.passwordHash || !ok) return { user: null, userId: row?.id ?? null };
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.id));
  return { user: { id: row.id, name: row.name, email: row.email }, userId: row.id };
}
const DUMMY_HASH = hashPassword('password-che-non-esiste');

// ─── Link monouso: invito e nuova password ───────────────────────────────────

function linkFor(purpose: LinkPurpose, user: { id: string; passwordHash: string | null }) {
  const ttl = purpose === 'invite' ? INVITE_TTL_S : RESET_TTL_S;
  const token = signLinkToken({ p: purpose, uid: user.id, fp: passwordFingerprint(user.passwordHash), exp: Math.floor(Date.now() / 1000) + ttl }, secret());
  return `${siteUrl()}/login/nuova-password?t=${encodeURIComponent(token)}`;
}

export async function sendInvite(ctx: Ctx, userId: string): Promise<boolean> {
  assertCan(ctx, 'users.manage');
  const [user] = await getDb().select().from(users).where(eq(users.id, userId));
  if (!user?.email) throw new DomainError('VALIDATION', { message: 'Serve un’email per inviare l’invito.' });
  const sent = await sendEmail(
    actionEmail({
      to: user.email,
      subject: 'Ti hanno invitato nell’admin della Pro Loco',
      intro: `Ciao ${user.name}, ti hanno dato accesso all’area riservata della Pro Loco Gasperina. Scegli una password per entrare.`,
      button: 'Scegli la password',
      url: linkFor('invite', user),
      outro: 'Il link vale 7 giorni e si usa una volta sola. Se non aspettavi questo invito, ignora l’email.',
    }),
  );
  if (sent) await audit(getDb(), ctx, 'user.invited', { entityType: 'user', entityId: userId });
  return sent;
}

/** Sempre la stessa risposta, che l'email esista o no. */
export async function requestPasswordReset(email: string, ip: string | null): Promise<void> {
  const [user] = await getDb().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  if (!user || !user.active || !user.email) return;
  await sendEmail(
    actionEmail({
      to: user.email,
      subject: 'Nuova password per l’admin della Pro Loco',
      intro: `Ciao ${user.name}, abbiamo ricevuto una richiesta per cambiare la tua password.`,
      button: 'Scegli una nuova password',
      url: linkFor('reset', user),
      outro: 'Il link vale 30 minuti e si usa una volta sola. Se non sei stato tu, ignora l’email: la password resta quella di prima.',
    }),
  );
  await audit(getDb(), { user: null, device: null, legacy: false, grants: [], ip }, 'auth.password_reset_requested', { entityType: 'user', entityId: user.id });
}

/** Controlla un link di invito o di nuova password senza usarlo. */
export async function checkPasswordLink(token: string): Promise<{ name: string; purpose: LinkPurpose } | null> {
  const payload = verifyLinkToken(token, secret());
  if (!payload) return null;
  const [user] = await getDb().select().from(users).where(eq(users.id, payload.uid));
  if (!user || !user.active || passwordFingerprint(user.passwordHash) !== payload.fp) return null;
  return { name: user.name, purpose: payload.p };
}

export async function setPasswordWithLink(token: string, password: string, ip: string | null): Promise<{ userId: string }> {
  const problem = passwordProblem(password);
  if (problem) throw new DomainError('VALIDATION', { message: problem });
  const payload = verifyLinkToken(token, secret());
  if (!payload) throw new DomainError('VALIDATION', { message: 'Il link non è valido o è scaduto. Chiedine uno nuovo.' });
  return withTransaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, payload.uid)).for('update');
    if (!user || !user.active || passwordFingerprint(user.passwordHash) !== payload.fp) {
      throw new DomainError('VALIDATION', { message: 'Il link non è valido o è già stato usato. Chiedine uno nuovo.' });
    }
    await tx.update(users).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(users.id, user.id));
    // Una password nuova chiude le sessioni aperte altrove.
    await tx.update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.userId, user.id), isNull(userSessions.revokedAt)));
    const self: Ctx = { user: { id: user.id, name: user.name, email: user.email }, device: null, legacy: false, grants: [], ip };
    await audit(tx, self, 'auth.password_set', { entityType: 'user', entityId: user.id, after: { via: payload.p === 'invite' ? 'invito' : 'nuova password' } });
    return { userId: user.id };
  });
}
