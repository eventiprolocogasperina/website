import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { countProblems, countTotal, needsDifferenceNote } from '@/lib/cash/denominations';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { cashRegisters, cashSessions, editions, users } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import '@/server/notifications/handlers';
import { lockEdition } from '@/server/domain/orders/shared';
import { assertCanOn, assertDeviceRegister, loadCashData, nextCounter, type CashSessionRow, type Db } from './shared';
import { cashTotals, expectedCash, type CashTotals } from './totals';

/** La cassa si apre solo quando l'edizione vende (stessi stati del canale pos in createOrder). */
const POS_OPEN_STATUSES = ['on_sale', 'sold_out', 'live'];

export const OpenSessionInput = z.object({
  registerId: z.uuid(),
  openingFloatCents: z.number().int().min(0, 'Il fondo cassa non può essere negativo.').max(1_000_000),
});

export type OpenSessionResult = { sessionId: string; joined: boolean };

/**
 * Apre il turno di una cassa con il fondo dichiarato. Se la cassa ha già un turno aperto (un altro
 * telefono sulla stessa cassa) ci si unisce a quello: un cassetto, un turno.
 */
export async function openSession(ctx: Ctx, input: z.input<typeof OpenSessionInput>): Promise<OpenSessionResult> {
  const data = OpenSessionInput.parse(input);
  return withTransaction(async (tx) => {
    const [register] = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, data.registerId)).for('update');
    if (!register) throw new DomainError('NOT_FOUND');
    const edition = await lockEdition(tx, register.editionId);
    assertCanOn(ctx, 'pos.open_close_session', edition.slug);
    if (ctx.device && ctx.device.edition !== edition.slug) throw new DomainError('FORBIDDEN');
    assertDeviceRegister(ctx, register.id);
    if (!register.active) throw new DomainError('CONFLICT', { message: 'Questa cassa è spenta. Chiedi a un responsabile di attivarla.' });
    if (!POS_OPEN_STATUSES.includes(edition.status)) throw new DomainError('SALES_CLOSED', { message: 'La cassa si apre solo quando l’edizione è in vendita o in corso.' });

    const [open] = await tx.select({ id: cashSessions.id }).from(cashSessions).where(and(eq(cashSessions.registerId, register.id), isNull(cashSessions.closedAt)));
    if (open) return { sessionId: open.id, joined: true };

    const [row] = await tx
      .insert(cashSessions)
      .values({ editionId: edition.id, registerId: register.id, deviceId: ctx.device?.id ?? null, openedBy: ctx.user?.id ?? null, openingFloatCents: data.openingFloatCents })
      .returning({ id: cashSessions.id });
    await audit(tx, ctx, 'cash.session_opened', { entityType: 'cash_session', entityId: row.id, edition: edition.slug, after: { register: register.name, openingFloatCents: data.openingFloatCents } });
    return { sessionId: row.id, joined: false };
  });
}

export type SessionSummary = {
  session: CashSessionRow;
  registerName: string;
  editionSlug: string;
  editionTitle: string;
  openedByName: string | null;
  closedByName: string | null;
  expectedCashCents: number;
  totals: CashTotals;
};

async function loadSession(db: Db, sessionId: string) {
  const [row] = await db
    .select({ s: cashSessions, register: cashRegisters.name, slug: editions.slug, title: editions.title })
    .from(cashSessions)
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .innerJoin(editions, eq(editions.id, cashSessions.editionId))
    .where(eq(cashSessions.id, sessionId));
  if (!row) throw new DomainError('NOT_FOUND');
  return row;
}

async function userName(db: Db, id: string | null): Promise<string | null> {
  if (!id) return null;
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, id));
  return u?.name ?? null;
}

/** Riepilogo di un turno: atteso in cassa e totali, calcolati ora (aperto) o congelati alla Z (chiuso). */
export async function sessionSummary(ctx: Ctx, sessionId: string): Promise<SessionSummary> {
  const id = z.uuid().parse(sessionId);
  const db = getDb();
  const row = await loadSession(db, id);
  if (!ctx.system && !canSeeSession(ctx, row.slug)) throw new DomainError('FORBIDDEN');
  const data = await loadCashData(db, { editionId: row.s.editionId, sessionId: id });
  const totals = row.s.zTotals ?? cashTotals(data.movements, data.lines, data.sales);
  return {
    session: row.s,
    registerName: row.register,
    editionSlug: row.slug,
    editionTitle: row.title,
    openedByName: await userName(db, row.s.openedBy),
    closedByName: await userName(db, row.s.closedBy),
    expectedCashCents: row.s.expectedCashCents ?? expectedCash(row.s.openingFloatCents, data.movements),
    totals,
  };
}

function canSeeSession(ctx: Ctx, slug: string) {
  if (ctx.device && ctx.device.edition !== slug) return false;
  return can(ctx, 'pos.open_close_session', { edition: slug }) || can(ctx, 'pos.view_totals', { edition: slug }) || can(ctx, 'reports.export', { edition: slug });
}

export const CloseSessionInput = z.object({
  sessionId: z.uuid(),
  /** Pezzi per taglio, chiave = taglio in centesimi. */
  denominations: z.record(z.string(), z.number().int().min(0).max(100_000)),
  notes: z.string().trim().max(1000).nullish(),
});

export type CloseSessionResult = { zReportNumber: number; expectedCashCents: number; countedCashCents: number; differenceCents: number };

/**
 * Chiusura Z: conteggio per taglio → atteso contro contato → differenza (con nota se supera 1 €) →
 * numero Z progressivo dell'edizione e totali congelati. Le vendite in corso sullo stesso turno
 * aspettano (il turno è bloccato) e poi vengono rifiutate perché il turno è chiuso.
 */
export async function closeSession(ctx: Ctx, input: z.input<typeof CloseSessionInput>, opts: { now?: Date } = {}): Promise<CloseSessionResult> {
  const data = CloseSessionInput.parse(input);
  const problems = countProblems(data.denominations);
  if (problems.length) throw new DomainError('VALIDATION', { message: problems[0] });
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx) => {
    const [session] = await tx.select().from(cashSessions).where(eq(cashSessions.id, data.sessionId)).for('update');
    if (!session) throw new DomainError('NOT_FOUND');
    const edition = await lockEdition(tx, session.editionId);
    assertCanOn(ctx, 'pos.open_close_session', edition.slug);
    if (ctx.device && ctx.device.edition !== edition.slug) throw new DomainError('FORBIDDEN');
    assertDeviceRegister(ctx, session.registerId);
    if (session.closedAt) throw new DomainError('CONFLICT', { message: 'Il turno è già chiuso.' });

    const cash = await loadCashData(tx, { editionId: edition.id, sessionId: session.id });
    const expected = expectedCash(session.openingFloatCents, cash.movements);
    const counted = countTotal(data.denominations);
    const difference = counted - expected;
    if (needsDifferenceNote(difference) && (data.notes ?? '').length < 3) {
      throw new DomainError('VALIDATION', { message: 'La differenza supera 1 €: scrivi una nota che la spieghi.' });
    }
    const zReportNumber = await nextCounter(tx, edition.id, 'z_report');
    const totals = cashTotals(cash.movements, cash.lines, cash.sales);
    await tx
      .update(cashSessions)
      .set({
        closedAt: now,
        closedBy: ctx.user?.id ?? null,
        countedCashCents: counted,
        expectedCashCents: expected,
        differenceCents: difference,
        denominations: Object.fromEntries(Object.entries(data.denominations).filter(([, n]) => n > 0)),
        zReportNumber,
        zTotals: totals,
        notes: data.notes || null,
        updatedAt: now,
      })
      .where(eq(cashSessions.id, session.id));
    await audit(tx, ctx, 'cash.session_closed', {
      entityType: 'cash_session',
      entityId: session.id,
      edition: edition.slug,
      after: { zReportNumber, expectedCashCents: expected, countedCashCents: counted, differenceCents: difference, netCents: totals.netCents },
      reason: data.notes || null,
    });
    const [register] = await tx.select({ name: cashRegisters.name }).from(cashRegisters).where(eq(cashRegisters.id, session.registerId));
    events.push({
      type: 'cash.session_closed',
      sessionId: session.id,
      edition: edition.slug,
      registerName: register?.name ?? 'Cassa',
      zReportNumber,
      expectedCashCents: expected,
      countedCashCents: counted,
      differenceCents: difference,
    });
    return { zReportNumber, expectedCashCents: expected, countedCashCents: counted, differenceCents: difference };
  });
  await publish(events);
  return result;
}

export type SessionListRow = {
  id: string;
  registerName: string;
  openedAt: Date;
  openedByName: string | null;
  closedAt: Date | null;
  openingFloatCents: number;
  differenceCents: number | null;
  zReportNumber: number | null;
  netCents: number | null;
  notes: string | null;
};

/** Turni dell'edizione per l'admin, dal più recente. */
export async function listSessions(ctx: Ctx, slug: string, editionId: string): Promise<SessionListRow[]> {
  assertCanOn(ctx, 'reports.export', slug);
  const rows = await getDb()
    .select({ s: cashSessions, register: cashRegisters.name, opener: users.name })
    .from(cashSessions)
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .leftJoin(users, eq(users.id, cashSessions.openedBy))
    .where(eq(cashSessions.editionId, editionId))
    .orderBy(desc(cashSessions.openedAt));
  return rows.map(({ s, register, opener }) => ({
    id: s.id,
    registerName: register,
    openedAt: s.openedAt,
    openedByName: opener,
    closedAt: s.closedAt,
    openingFloatCents: s.openingFloatCents,
    differenceCents: s.differenceCents,
    zReportNumber: s.zReportNumber,
    netCents: s.zTotals?.netCents ?? null,
    notes: s.notes,
  }));
}

/** Il turno aperto di una cassa, se c'è. */
export async function openSessionOf(registerId: string): Promise<CashSessionRow | null> {
  const [row] = await getDb().select().from(cashSessions).where(and(eq(cashSessions.registerId, registerId), isNull(cashSessions.closedAt)));
  return row ?? null;
}
