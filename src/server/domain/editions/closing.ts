import 'server-only';
// Checklist di chiusura (§9): i controlli del nucleo più quelli dei moduli attivi. "Archivia" si
// abilita solo quando ogni controllo è a posto o è stato saltato da un owner o admin con un motivo.
import { and, count, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { extensionPoints } from '@/modules/registry';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { cashSessions, editionClosingSkips, editionReports, editions, ordersV2, refundsV2, sessions, users, zuccalandPhotos } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { editionForWrite } from './index';

type Edition = typeof editions.$inferSelect;
type Db = Tx | ReturnType<typeof getDb>;

export type ClosingItem = {
  /** 'core:<chiave>' oppure '<modulo>:<chiave>'. */
  key: string;
  module: string | null;
  label: string;
  ok: boolean;
  /** Cosa manca, in una riga ("2 ordini in attesa"). */
  detail: string;
  /** Dove si risolve. */
  href: string | null;
  /** true = non si può saltare. */
  blocking: boolean;
  skipped: { reason: string; by: string | null; at: string } | null;
};

export type ClosingChecklist = { items: ClosingItem[]; complete: boolean; lastReportAt: string | null };

type Result = { ok: boolean; detail: string; href: string | null };
type Evaluator = (db: Db, e: Edition, now: Date) => Promise<Result>;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Controlli del nucleo, in ordine (§9). */
const CORE: Array<{ key: string; label: string; evaluate: Evaluator }> = [
  {
    // La differenza oltre 1 € si giustifica già alla chiusura del turno (nota obbligatoria, prompt 14).
    key: 'cash-sessions',
    label: 'Tutti i turni di cassa sono chiusi',
    evaluate: async (db, e) => {
      const [r] = await db
        .select({ n: count() })
        .from(cashSessions)
        .where(and(eq(cashSessions.editionId, e.id), isNull(cashSessions.closedAt)));
      return { ok: r.n === 0, detail: r.n ? plural(r.n, 'turno ancora aperto', 'turni ancora aperti') : 'Nessun turno aperto', href: `/admin/e/${e.slug}/cassa?tab=turni` };
    },
  },
  {
    key: 'pending-orders',
    label: 'Nessun ordine in attesa di pagamento',
    evaluate: async (db, e) => {
      const [r] = await db
        .select({ n: count() })
        .from(ordersV2)
        .where(and(eq(ordersV2.editionId, e.id), eq(ordersV2.status, 'pending'), isNull(ordersV2.deletedAt)));
      return { ok: r.n === 0, detail: r.n ? plural(r.n, 'ordine in attesa', 'ordini in attesa') : 'Nessun ordine in attesa', href: `/admin/e/${e.slug}/ordini?stato=pending` };
    },
  },
  {
    key: 'refunds-closed',
    label: 'Tutte le richieste di rimborso sono chiuse',
    evaluate: async (db, e) => {
      const [r] = await db
        .select({ n: count() })
        .from(refundsV2)
        .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
        .where(and(eq(ordersV2.editionId, e.id), inArray(refundsV2.status, ['requested', 'approved'])));
      return { ok: r.n === 0, detail: r.n ? plural(r.n, 'rimborso ancora aperto', 'rimborsi ancora aperti') : 'Nessun rimborso aperto', href: `/admin/e/${e.slug}/rimborsi` };
    },
  },
  {
    key: 'final-report',
    label: 'Rendiconto finale generato (PDF e CSV)',
    evaluate: async (db, e) => {
      const [r] = await db.select({ at: editionReports.createdAt }).from(editionReports).where(eq(editionReports.editionId, e.id)).orderBy(desc(editionReports.createdAt)).limit(1);
      return { ok: !!r, detail: r ? 'Generato' : 'Da generare', href: null };
    },
  },
];

/** Come si valuta ogni controllo dichiarato dai moduli (`admin.closingChecks`). */
const MODULE_EVALUATORS: Record<string, Evaluator> = {
  'time-slots:sessions-closed': async (db, e, now) => {
    const [r] = await db
      .select({ n: count() })
      .from(sessions)
      .where(and(eq(sessions.editionId, e.id), eq(sessions.status, 'open'), gt(sessions.startsAt, now)));
    return { ok: r.n === 0, detail: r.n ? plural(r.n, 'data futura ancora aperta', 'date future ancora aperte') : 'Tutte chiuse o passate', href: `/admin/e/${e.slug}/date` };
  },
  // Le foto stanno ancora nella tabella di Zuccaland, senza edizione: si contano tutte (vedi il modulo).
  'visitor-photos:photos-moderated': async (db, e) => {
    const [r] = await db.select({ n: count() }).from(zuccalandPhotos).where(eq(zuccalandPhotos.status, 'pending'));
    return { ok: r.n === 0, detail: r.n ? plural(r.n, 'foto da moderare', 'foto da moderare') : '0 foto da moderare', href: `/admin/e/${e.slug}/m/visitor-photos` };
  },
};

async function evaluate(db: Db, e: Edition, now = new Date()): Promise<ClosingChecklist> {
  const declared = [
    ...CORE.map((c) => ({ key: `core:${c.key}`, module: null, label: c.label, blocking: false, evaluate: c.evaluate })),
    ...extensionPoints.closingChecks(e).map((c) => {
      const key = `${c.module}:${c.key}`;
      const evaluate: Evaluator = MODULE_EVALUATORS[key] ?? (async () => ({ ok: false, detail: 'Controllo non disponibile: saltalo con un motivo', href: null }));
      return { key, module: c.module as string, label: c.label, blocking: c.blocking, evaluate };
    }),
  ];
  const [results, skips, [report]] = await Promise.all([
    Promise.all(declared.map((d) => d.evaluate(db, e, now))),
    db
      .select({ key: editionClosingSkips.checkKey, reason: editionClosingSkips.reason, at: editionClosingSkips.skippedAt, by: users.name })
      .from(editionClosingSkips)
      .leftJoin(users, eq(users.id, editionClosingSkips.skippedBy))
      .where(eq(editionClosingSkips.editionId, e.id)),
    db.select({ at: editionReports.createdAt }).from(editionReports).where(eq(editionReports.editionId, e.id)).orderBy(desc(editionReports.createdAt)).limit(1),
  ]);
  const items: ClosingItem[] = declared.map((d, i) => {
    const s = skips.find((x) => x.key === d.key);
    return {
      key: d.key,
      module: d.module,
      label: d.label,
      blocking: d.blocking,
      ...results[i],
      skipped: s && !results[i].ok ? { reason: s.reason, by: s.by, at: s.at.toISOString() } : null,
    };
  });
  return { items, complete: items.every((i) => i.ok || i.skipped), lastReportAt: report?.at.toISOString() ?? null };
}

export async function getClosingChecklist(ctx: Ctx, slug: string): Promise<ClosingChecklist> {
  if (!can(ctx, 'editions.edit', { edition: slug })) throw new DomainError('FORBIDDEN');
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  return evaluate(getDb(), e);
}

/** Chiamata da changeEditionStatus prima di archiviare, dentro la stessa transazione. */
export async function assertClosingComplete(db: Db, e: Edition): Promise<void> {
  const list = await evaluate(db, e);
  const missing = list.items.filter((i) => !i.ok && !i.skipped);
  if (missing.length) throw new DomainError('CONFLICT', { message: `Prima di archiviare completa la checklist di chiusura: ${missing.map((m) => m.label.toLowerCase()).join('; ')}.` });
}

const SkipInput = z.object({ key: z.string().min(3).max(80), reason: z.string().trim().min(5, 'Scrivi il motivo (almeno 5 caratteri).').max(500) });

/** "Salta con motivazione": solo owner e admin, solo a edizione conclusa. */
export async function skipClosingCheck(ctx: Ctx, slug: string, input: z.input<typeof SkipInput>): Promise<void> {
  const data = SkipInput.parse(input);
  if (!can(ctx, 'editions.archive', { edition: slug })) throw new DomainError('FORBIDDEN');
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    if (e.status !== 'concluded') throw new DomainError('CONFLICT', { message: 'La checklist si usa solo a edizione conclusa.' });
    const item = (await evaluate(tx, e)).items.find((i) => i.key === data.key);
    if (!item) throw new DomainError('NOT_FOUND');
    if (item.blocking) throw new DomainError('CONFLICT', { message: 'Questo controllo non si può saltare.' });
    await tx
      .insert(editionClosingSkips)
      .values({ editionId: e.id, checkKey: data.key, reason: data.reason, skippedBy: ctx.user?.id ?? null })
      .onConflictDoUpdate({ target: [editionClosingSkips.editionId, editionClosingSkips.checkKey], set: { reason: data.reason, skippedBy: ctx.user?.id ?? null, skippedAt: new Date() } });
    await audit(tx, ctx, 'edition.closing_check_skipped', { entityType: 'edition', entityId: e.id, edition: slug, after: { check: data.key }, reason: data.reason });
  });
}

export async function unskipClosingCheck(ctx: Ctx, slug: string, key: string): Promise<void> {
  if (!can(ctx, 'editions.archive', { edition: slug })) throw new DomainError('FORBIDDEN');
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    const gone = await tx
      .delete(editionClosingSkips)
      .where(and(eq(editionClosingSkips.editionId, e.id), eq(editionClosingSkips.checkKey, key)))
      .returning();
    if (gone.length) await audit(tx, ctx, 'edition.closing_check_unskipped', { entityType: 'edition', entityId: e.id, edition: slug, before: { check: key, reason: gone[0].reason } });
  });
}
