import 'server-only';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { checkinLists, checkins, editions, products, sessions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { editionForWrite } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';

export const CheckinListInput = z.object({
  name: z.string().trim().min(2, 'Scrivi un nome, es. Ingresso.').max(80),
  productIds: z.array(z.string().uuid()).max(100).default([]),
  sessionId: z.string().uuid().nullish(),
  allowMultiple: z.boolean().default(false),
});

export type CheckinListRow = { id: string; name: string; productIds: string[]; sessionId: string | null; allowMultiple: boolean; checkins: number };

/** Liste di check-in dell'edizione, con quanti passaggi hanno già (per sapere se si possono eliminare). */
export async function listCheckinLists(ctx: Ctx, editionSlug: string): Promise<CheckinListRow[]> {
  if (!can(ctx, 'checkin.scan', { edition: editionSlug }) && !can(ctx, 'catalog.edit', { edition: editionSlug })) throw new DomainError('FORBIDDEN');
  const db = getDb();
  const rows = await db
    .select({ id: checkinLists.id, name: checkinLists.name, productIds: checkinLists.productIds, sessionId: checkinLists.sessionId, allowMultiple: checkinLists.allowMultiple })
    .from(checkinLists)
    .innerJoin(editions, eq(editions.id, checkinLists.editionId))
    .where(eq(editions.slug, editionSlug))
    .orderBy(asc(checkinLists.createdAt), asc(checkinLists.name));
  if (!rows.length) return [];
  const used = await db
    .select({ listId: checkins.checkinListId, n: count() })
    .from(checkins)
    .where(inArray(checkins.checkinListId, rows.map((r) => r.id)))
    .groupBy(checkins.checkinListId);
  return rows.map((r) => ({ ...r, checkins: used.find((u) => u.listId === r.id)?.n ?? 0 }));
}

/** Crea o modifica una lista di check-in. Prodotti e data devono essere dell'edizione. */
export async function saveCheckinList(ctx: Ctx, editionSlug: string, id: string | null, input: z.input<typeof CheckinListInput>): Promise<{ id: string }> {
  if (!can(ctx, 'catalog.edit', { edition: editionSlug })) throw new DomainError('FORBIDDEN');
  const data = CheckinListInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await editionForWrite(tx, editionSlug);
    const productIds = [...new Set(data.productIds)];
    if (productIds.length) {
      const known = await tx.select({ id: products.id }).from(products).where(and(eq(products.editionId, edition.id), inArray(products.id, productIds)));
      if (known.length !== productIds.length) throw new DomainError('VALIDATION', { message: 'Un prodotto scelto non è di questa edizione.' });
    }
    if (data.sessionId) {
      const [s] = await tx.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, data.sessionId), eq(sessions.editionId, edition.id)));
      if (!s) throw new DomainError('VALIDATION', { message: 'La data scelta non è di questa edizione.' });
    }
    const values = { name: data.name, productIds, sessionId: data.sessionId ?? null, allowMultiple: data.allowMultiple };
    if (!id) {
      const [row] = await tx
        .insert(checkinLists)
        .values({ ...values, editionId: edition.id })
        .returning({ id: checkinLists.id });
      await audit(tx, ctx, 'checkin_list.created', { entityType: 'checkin_list', entityId: row.id, edition: edition.slug, after: values });
      return row;
    }
    const [before] = await tx
      .select()
      .from(checkinLists)
      .where(and(eq(checkinLists.id, id), eq(checkinLists.editionId, edition.id)))
      .for('update');
    if (!before) throw new DomainError('NOT_FOUND');
    await tx.update(checkinLists).set({ ...values, updatedAt: new Date() }).where(eq(checkinLists.id, id));
    await audit(tx, ctx, 'checkin_list.updated', { entityType: 'checkin_list', entityId: id, edition: edition.slug, before: { name: before.name, productIds: before.productIds, sessionId: before.sessionId, allowMultiple: before.allowMultiple }, after: values });
    return { id };
  });
}

/** Elimina una lista mai usata. Una lista con passaggi resta: i passaggi sono storico. */
export async function deleteCheckinList(ctx: Ctx, editionSlug: string, id: string): Promise<void> {
  if (!can(ctx, 'catalog.edit', { edition: editionSlug })) throw new DomainError('FORBIDDEN');
  await withTransaction(async (tx) => {
    const edition = await editionForWrite(tx, editionSlug);
    const [list] = await tx
      .select()
      .from(checkinLists)
      .where(and(eq(checkinLists.id, id), eq(checkinLists.editionId, edition.id)))
      .for('update');
    if (!list) throw new DomainError('NOT_FOUND');
    const [{ n }] = await tx.select({ n: count() }).from(checkins).where(eq(checkins.checkinListId, id));
    if (n > 0) throw new DomainError('CONFLICT', { message: 'La lista ha già degli ingressi registrati: non si può eliminare.' });
    await tx.delete(checkinLists).where(eq(checkinLists.id, id));
    await audit(tx, ctx, 'checkin_list.deleted', { entityType: 'checkin_list', entityId: id, edition: edition.slug, before: { name: list.name } });
  });
}

/** Prodotti con biglietto e date dell'edizione, per il modulo della lista. */
export async function checkinListOptions(ctx: Ctx, editionSlug: string) {
  if (!can(ctx, 'checkin.scan', { edition: editionSlug }) && !can(ctx, 'catalog.edit', { edition: editionSlug })) throw new DomainError('FORBIDDEN');
  const db = getDb();
  const [edition] = await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, editionSlug));
  if (!edition) throw new DomainError('NOT_FOUND');
  const [prods, days] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, active: products.active })
      .from(products)
      .where(and(eq(products.editionId, edition.id), eq(products.issuesTicket, true)))
      .orderBy(asc(products.sort), asc(products.name)),
    db.select({ id: sessions.id, label: sessions.label, status: sessions.status, rescheduledTo: sessions.rescheduledToSessionId }).from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
  ]);
  return { products: prods, sessions: days.filter((d) => !(d.status === 'postponed' && d.rescheduledTo)).map((d) => ({ id: d.id, label: d.label })) };
}
