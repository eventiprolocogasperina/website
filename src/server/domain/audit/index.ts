import 'server-only';
import { and, count, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { can } from '@/server/auth/permissions';
import { getDb, type Tx } from '@/server/db/client';
import { auditLog } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { actorLabel, type Ctx } from '@/server/auth/context-shared';

type Db = Tx | ReturnType<typeof getDb>;

/** Chiavi che non entrano mai nel registro (§18: niente IBAN né token nei log). */
const SECRET_KEY = /password|pin|token|secret|iban|hash/i;

export function sanitizeForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || depth > 5) return value ?? null;
  if (Array.isArray(value)) return value.map((v) => sanitizeForAudit(v, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[nascosto]' : sanitizeForAudit(v, depth + 1)]),
    );
  }
  return value;
}

export type AuditInput = {
  entityType?: string;
  entityId?: string | null;
  edition?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
};

/**
 * Scrive una riga nel registro attività. Da chiamare dentro la stessa transazione della modifica,
 * così la riga esiste solo se la modifica è andata a buon fine.
 */
export async function audit(db: Db, ctx: Ctx | null, action: string, input: AuditInput = {}) {
  await db.insert(auditLog).values({
    actorUserId: ctx?.user?.id ?? null,
    actorDeviceId: ctx?.device?.id ?? null,
    actorLabel: ctx ? actorLabel(ctx) : 'sistema',
    action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    editionSlug: input.edition ?? ctx?.device?.edition ?? null,
    before: input.before === undefined ? null : sanitizeForAudit(input.before),
    after: input.after === undefined ? null : sanitizeForAudit(input.after),
    reason: input.reason ?? null,
    ip: ctx?.ip ?? null,
  });
}

export { AUDIT_ACTION_LABELS } from './labels';

export type AuditFilters = { user?: string; action?: string; edition?: string; from?: string; to?: string; page?: number };
export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  edition: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
};

export const AUDIT_PAGE_SIZE = 50;

/** Registro attività, dal più recente. Le date sono giorni (AAAA-MM-GG) in ora italiana. */
export async function listAudit(ctx: Ctx, filters: AuditFilters): Promise<{ rows: AuditRow[]; total: number }> {
  if (!can(ctx, 'audit.read')) throw new DomainError('FORBIDDEN');
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const where = and(
    filters.user ? eq(auditLog.actorUserId, filters.user) : undefined,
    filters.action ? eq(auditLog.action, filters.action) : undefined,
    filters.edition ? eq(auditLog.editionSlug, filters.edition) : undefined,
    filters.from && day.test(filters.from) ? gte(auditLog.at, sql`(${filters.from}::date)::timestamp AT TIME ZONE 'Europe/Rome'`) : undefined,
    filters.to && day.test(filters.to) ? lt(auditLog.at, sql`((${filters.to}::date + 1))::timestamp AT TIME ZONE 'Europe/Rome'`) : undefined,
  );
  const db = getDb();
  const page = Math.max(0, filters.page ?? 0);
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(auditLog).where(where).orderBy(desc(auditLog.at)).limit(AUDIT_PAGE_SIZE).offset(page * AUDIT_PAGE_SIZE),
    db.select({ n: count() }).from(auditLog).where(where),
  ]);
  return {
    total: n,
    rows: rows.map((r) => ({
      id: r.id,
      at: r.at.toISOString(),
      actor: r.actorLabel ?? 'sistema',
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      edition: r.editionSlug,
      before: r.before,
      after: r.after,
      reason: r.reason,
    })),
  };
}
