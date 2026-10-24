// Procedura guidata "Nuova edizione" su un Postgres vero (npm run test:db): copia dall'edizione precedente
// (senza ordini, con l'edizione archiviata di partenza intatta), passi saltati, guardia delle vendite.
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { cashRegisters, checkinLists, discountsV2, editions, ordersV2, products, quotas, series, sessions } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { createOrder } from '@/server/domain/orders';
import { saveRegister } from '@/server/domain/cash/registers';
import { saveSession } from '@/server/domain/catalog';
import { anon, buyer, createDiscount, createEdition, key, owner, roleOn } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { changeEditionStatus } from './index';
import { getSetupChecklist, saveRulesUrl, saveSetupWhereWhen, skipSetupStep, startEditionWizard } from './setup';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorOf(p: Promise<unknown>): Promise<DomainError | string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e;
    if ((e as { name?: string }).name === 'ZodError') return 'ZOD';
    throw e;
  }
  return 'nessun errore';
}

/** Tutte le righe di un'edizione che la copia non deve toccare, per confrontarle prima e dopo. */
async function snapshot(editionId: string) {
  const db = getDb();
  const [e] = await db.select().from(editions).where(eq(editions.id, editionId));
  return {
    edition: e,
    sessions: await db.select().from(sessions).where(eq(sessions.editionId, editionId)),
    products: await db.select().from(products).where(eq(products.editionId, editionId)),
    registers: await db.select().from(cashRegisters).where(eq(cashRegisters.editionId, editionId)),
    lists: await db.select().from(checkinLists).where(eq(checkinLists.editionId, editionId)),
    orders: await db.select().from(ordersV2).where(eq(ordersV2.editionId, editionId)),
  };
}

describe.skipIf(!enabled)('procedura guidata "Nuova edizione"', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('parte dall’ultima edizione del format: copia tutto tranne ordini e sconti, e non tocca l’archiviata', async () => {
    const db = getDb();
    const suffix = randomUUID().slice(0, 6);
    const [s] = await db.insert(series).values({ slug: `zucche-${suffix}`, name: `Zucche ${suffix}`, theme: { dot: 'orange' } }).returning();
    const f = await createEdition({ modules: ['time-slots', 'activities'] });
    await db.update(editions).set({ seriesId: s.id }).where(eq(editions.id, f.edition.id));
    // Una cassa principale (tutto) e una secondaria con i soli prodotti scelti.
    await saveRegister(owner, f.slug, null, { name: 'Ingresso', issuesNumbers: true, active: true, productIds: null });
    await saveRegister(owner, f.slug, null, { name: 'Bar', issuesNumbers: false, active: true, productIds: [f.drink.id] });
    await db
      .update(editions)
      .set({
        subtitle: 'Il villaggio delle zucche 2026',
        notificationSettings: { orderPaid: false },
        moduleSettings: {
          activities: { labProductId: f.lab.id, activities: [{ key: 'zucca', label: 'Zucca in vaso', sessionIds: [f.day1.id], maxPlaces: 20 }] },
          _setup: { kind: 'sales', skipped: ['registers'] },
        },
        pageBlocks: [
          { id: 'hero', type: 'Hero', hidden: false, props: { title: 'Zucche 2026' } },
          { id: 'regole', type: 'Allegati', hidden: false, props: { title: 'Allegati', items: [{ label: 'Regolamento', url: 'https://example.com/r.pdf' }] } },
        ],
      })
      .where(eq(editions.id, f.edition.id));
    await db.update(products).set({ checkinListIds: [f.entrance.id] }).where(eq(products.id, f.ticket.id));
    await createOrder(anon, { editionId: f.edition.id, channel: 'online', customer: buyer, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], idempotencyKey: key() });
    const code = `Z${suffix.toUpperCase()}`;
    await createDiscount({ code, editionId: f.edition.id });
    // Edizione conclusa e archiviata: da qui in poi in sola lettura.
    await db.update(editions).set({ status: 'archived', archivedAt: new Date() }).where(eq(editions.id, f.edition.id));
    const before = await snapshot(f.edition.id);

    const slug = `zucche-${suffix}-2027`;
    const { slug: created } = await startEditionWizard(owner, { type: 'format', seriesId: s.id, fromPrevious: true, title: 'Zucche 2027', slug, year: 2027 });
    expect(created).toBe(slug);

    const after = await snapshot(f.edition.id);
    expect(after).toEqual(before);

    const copy = await snapshot((await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, slug)))[0].id);
    expect(copy.edition).toMatchObject({ status: 'draft', seriesId: s.id, year: 2027, subtitle: 'Il villaggio delle zucche 2027', location: 'Gasperina', notificationSettings: { orderPaid: false } });
    // Niente ordini né codici sconto (unici, con i loro utilizzi).
    expect(copy.orders).toEqual([]);
    expect(await db.select().from(discountsV2).where(eq(discountsV2.editionId, copy.edition.id))).toEqual([]);

    // Date spostate di 52 settimane (stesso giorno della settimana), con le loro capienze.
    expect(copy.sessions.map((x) => [x.label, x.capacity, x.startsAt.toISOString()]).sort()).toEqual([
      ['Dom 24 ott', 1000, '2027-10-24T07:00:00.000Z'] /* stessa ora di Roma, dopo il cambio dell'ora */,
      ['Sab 23 ott', 2, '2027-10-23T08:00:00.000Z'],
    ]);
    // Prodotti con i prezzi, quote e casse con la loro lista di prodotti puntano alla copia.
    expect(copy.products.map((p) => [p.name, p.priceCents]).sort()).toEqual([
      ['Acqua', 100],
      ['Ingresso', 500],
      ['Laboratorio', 300],
    ]);
    const newIds = new Set([...copy.products, ...copy.sessions, ...copy.lists, ...copy.registers].map((x) => x.id));
    const bar = copy.registers.find((r) => r.name === 'Bar')!;
    expect(bar.productIds).toEqual([copy.products.find((p) => p.name === 'Acqua')!.id]);
    expect(copy.registers.find((r) => r.name === 'Ingresso')!.productIds).toBeNull();
    expect(copy.lists).toHaveLength(1);
    expect(copy.lists[0].productIds.every((id) => newIds.has(id))).toBe(true);
    expect(copy.products.find((p) => p.name === 'Ingresso')!.checkinListIds).toEqual([copy.lists[0].id]);
    const [q] = await db.select().from(quotas).where(eq(quotas.editionId, copy.edition.id));
    expect(q).toMatchObject({ name: 'Laboratorio', size: 1 });

    // Impostazioni dei moduli con gli ID nuovi; della procedura solo il tipo, non i passi saltati della vecchia.
    const settings = copy.edition.moduleSettings as { activities: { labProductId: string; activities: Array<{ sessionIds: string[] }> }; _setup: unknown };
    expect(newIds.has(settings.activities.labProductId)).toBe(true);
    expect(newIds.has(settings.activities.activities[0].sessionIds[0])).toBe(true);
    expect(settings._setup).toEqual({ kind: 'sales', skipped: [] });
    expect((copy.edition.pageBlocks as Array<{ props: { title: string } }>)[0].props.title).toBe('Zucche 2027');

    // La copia ha già tutto quello che serve per le vendite, tranne le date da rivedere (nessuna).
    const list = await getSetupChecklist(owner, slug);
    expect(list.items.filter((i) => i.status === 'done').map((i) => i.key)).toEqual(['dates', 'tickets', 'extras', 'page', 'rules', 'registers']);
    await changeEditionStatus(owner, slug, { to: 'published' });
    await changeEditionStatus(owner, slug, { to: 'on_sale' });

    // L'archiviata resta in sola lettura anche per la procedura.
    expect(((await errorOf(skipSetupStep(owner, f.slug, 'extras'))) as DomainError).code).toBe('EDITION_ARCHIVED');
  });

  it('evento informativo: passi saltati, e le vendite restano chiuse finché mancano i passi necessari', async () => {
    const slug = `festa-${randomUUID().slice(0, 6)}`;
    await startEditionWizard(owner, { type: 'info', title: 'Festa in piazza 2027', slug, year: 2027 });
    let list = await getSetupChecklist(owner, slug);
    expect(list.kind).toBe('info');
    expect(list.items.map((i) => [i.key, i.status])).toEqual([
      ['dates', 'todo'],
      ['page', 'todo'],
      ['publish', 'todo'],
    ]);

    await skipSetupStep(owner, slug, 'page');
    expect(await errorOf(skipSetupStep(owner, slug, 'publish'))).toBeInstanceOf(DomainError);
    expect(await errorOf(skipSetupStep(owner, slug, 'boh'))).toBe('ZOD');
    expect(((await errorOf(skipSetupStep(roleOn('editor', slug), slug, 'page'))) as DomainError).code).toBe('FORBIDDEN');
    await saveSetupWhereWhen(owner, slug, { location: 'Piazza Municipio', startsDate: '2027-08-14', startsTime: '21:00', endsDate: null, endsTime: null });
    list = await getSetupChecklist(owner, slug);
    expect(list.items.map((i) => [i.key, i.status])).toEqual([
      ['dates', 'done'],
      ['page', 'skipped'],
      ['publish', 'todo'],
    ]);

    // Si pubblica, ma le vendite non si aprono: il messaggio dice cosa manca.
    await changeEditionStatus(owner, slug, { to: 'published' });
    const err = (await errorOf(changeEditionStatus(owner, slug, { to: 'on_sale' }))) as DomainError;
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe(
      'Prima di aprire le vendite completa: Date e luogo (aggiungi almeno una data); Biglietti e prezzi (nessun biglietto in vendita online); Pagina e grafica (manca la descrizione dell’evento); Regolamento (manca il link al regolamento).',
    );
    const [row] = await getDb().select({ status: editions.status, id: editions.id }).from(editions).where(eq(editions.slug, slug));
    expect(row.status).toBe('published');

    // Con data, biglietto e regolamento le vendite si aprono; il regolamento finisce nel blocco Allegati.
    await saveSession(owner, slug, null, { label: 'Sab 14 ago', date: '2027-08-14', startTime: '21:00', endTime: null, capacity: 400, status: 'open' });
    await getDb().insert(products).values({ editionId: row.id, kind: 'ticket', name: 'Ingresso', priceCents: 500, channels: ['online'], requiresSession: true, issuesTicket: true });
    expect(await errorOf(saveRulesUrl(owner, slug, 'javascript:alert(1)'))).toBe('ZOD');
    await saveRulesUrl(owner, slug, 'https://example.com/regolamento.pdf');
    await saveRulesUrl(owner, slug, 'https://example.com/regolamento-v2.pdf');
    const [e] = await getDb().select().from(editions).where(eq(editions.id, row.id));
    const allegati = (e.pageBlocks as Array<{ type: string; props: { items: Array<{ label: string; url: string }> } }>).filter((b) => b.type === 'Allegati');
    expect(allegati).toHaveLength(1);
    expect(allegati[0].props.items).toEqual([{ label: 'Regolamento', url: 'https://example.com/regolamento-v2.pdf' }]);
    // La pagina mai salvata prende i blocchi proposti più gli allegati: la pagina pubblica non si svuota.
    expect((e.pageBlocks as unknown[]).length).toBeGreaterThan(1);

    await changeEditionStatus(owner, slug, { to: 'on_sale' });
    const [onSale] = await getDb()
      .select({ status: editions.status, startsAt: editions.startsAt })
      .from(editions)
      .where(and(eq(editions.id, row.id), inArray(editions.status, ['on_sale'])));
    expect(onSale.status).toBe('on_sale');
  });

  it('format nuovo creato insieme alla prima edizione; con le date, inizio e fine vengono da lì', async () => {
    const suffix = randomUUID().slice(0, 6);
    const slug = `gita-${suffix}-2027`;
    await startEditionWizard(owner, { type: 'new-format', formatName: `Gite ${suffix}`, formatSlug: `gite-${suffix}`, dot: 'blue', sales: true, title: 'Gita a Tropea 2027', slug, year: 2027 });
    const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
    const [s] = await getDb().select().from(series).where(eq(series.id, e.seriesId!));
    expect(s.slug).toBe(`gite-${suffix}`);
    expect((await getSetupChecklist(owner, slug)).kind).toBe('sales');

    await saveSession(owner, slug, null, { label: 'Dom 6 giu', date: '2027-06-06', startTime: '07:30', endTime: '20:00', capacity: 50, status: 'open' });
    await saveSession(owner, slug, null, { label: 'Dom 13 giu', date: '2027-06-13', startTime: '07:30', endTime: '20:00', capacity: 50, status: 'open' });
    await saveSetupWhereWhen(owner, slug, { location: 'Partenza dal Municipio' });
    const [after] = await getDb().select().from(editions).where(eq(editions.slug, slug));
    expect(after.location).toBe('Partenza dal Municipio');
    expect(after.startsAt?.toISOString()).toBe('2027-06-06T05:30:00.000Z');
    expect(after.endsAt?.toISOString()).toBe('2027-06-13T18:00:00.000Z');
  });
});
