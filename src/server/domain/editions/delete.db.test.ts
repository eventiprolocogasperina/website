// Eliminazione di edizioni e format su un Postgres vero: solo senza storia, mai le archiviate, sempre nel registro.
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { auditLog, editions, series } from '@/server/db/schema';
import { buyer, createEdition, key, owner, roleOn } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';

const { deleteEdition, deleteSeries } = await import('./delete');
const { createOrder } = await import('@/server/domain/orders');

describe('eliminazione', () => {
  afterAll(closeTestDb);

  it('un’edizione senza ordini si elimina con date, prodotti e lista di check-in; resta nel registro', async () => {
    const f = await createEdition({ status: 'draft' });
    await expect(deleteEdition(roleOn('event_manager', f.slug), f.slug)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await deleteEdition(owner, f.slug);
    expect(await getDb().select().from(editions).where(eq(editions.id, f.edition.id))).toHaveLength(0);
    const logs = await getDb().select().from(auditLog).where(eq(auditLog.entityId, f.edition.id));
    expect(logs.map((l) => l.action)).toContain('edition.deleted');
  });

  it('con ordini o archiviata non si elimina', async () => {
    const f = await createEdition();
    await createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], customer: buyer, idempotencyKey: key(), payNow: 'cash' });
    await expect(deleteEdition(owner, f.slug)).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('1 ordini') });
    const a = await createEdition({ status: 'archived' });
    await expect(deleteEdition(owner, a.slug)).rejects.toMatchObject({ code: 'EDITION_ARCHIVED' });
  });

  it('un format con edizioni non si elimina, vuoto sì', async () => {
    const [s] = await getDb().insert(series).values({ slug: `f-${key().slice(0, 8)}`, name: 'Format di prova' }).returning();
    const f = await createEdition({ status: 'draft' });
    await getDb().update(editions).set({ seriesId: s.id }).where(eq(editions.id, f.edition.id));
    await expect(deleteSeries(owner, s.id)).rejects.toMatchObject({ code: 'CONFLICT' });
    await deleteEdition(owner, f.slug);
    await deleteSeries(owner, s.id);
    expect(await getDb().select().from(series).where(eq(series.id, s.id))).toHaveLength(0);
  });
});
