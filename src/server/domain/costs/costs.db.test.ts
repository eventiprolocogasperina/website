// Costi e inventario su un Postgres vero (npm run test:db): blocco dopo "conclusa", annullamento al
// posto della cancellazione, saldo del rendiconto e bilancio dei movimenti del materiale.
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { auditLog, costs, editions, inventoryItems, inventoryMovements } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { adjustItem, assignToEdition, createItem, dismissItem, editionMaterials, listItems, returnFromEdition } from '@/server/domain/inventory';
import { createOrder } from '@/server/domain/orders';
import { recordPayment } from '@/server/domain/payments';
import { editionTotals } from '@/server/domain/stats';
import { anon, buyer, createEdition, key, owner, roleOn, system } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { costsCsv, createCost, editionCostTotals, listCosts, openReceipt, updateCost, voidCost, yearlySummary, type CostInput } from './index';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    if ((e as { name?: string }).name === 'ZodError') return 'ZOD';
    throw e;
  }
  return 'nessun errore';
}

const cost = (over: Partial<CostInput> = {}): CostInput => ({
  spentOn: '2026-10-20',
  category: 'Noleggi',
  description: 'Gazebo 3x3',
  supplier: 'Noleggi Rossi',
  amountCents: 12_000,
  paymentMethod: 'bank_transfer',
  paid: true,
  ...over,
});

const setStatus = (id: string, status: (typeof editions.$inferSelect)['status']) => getDb().update(editions).set({ status }).where(eq(editions.id, id));

describe.skipIf(!enabled)('costi', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('si modificano finché l’edizione non è conclusa, poi sono in sola lettura', async () => {
    const f = await createEdition();
    const { id } = await createCost(owner, f.slug, cost());
    await updateCost(owner, id, cost({ amountCents: 15_000 }));
    expect((await listCosts(owner, f.slug))[0].amountCents).toBe(15_000);

    await setStatus(f.edition.id, 'concluded');
    expect(await errorCode(createCost(owner, f.slug, cost()))).toBe('CONFLICT');
    expect(await errorCode(updateCost(owner, id, cost({ amountCents: 1 })))).toBe('CONFLICT');
    expect(await errorCode(voidCost(owner, id, 'Errore di battitura'))).toBe('CONFLICT');

    await setStatus(f.edition.id, 'archived');
    expect(await errorCode(createCost(owner, f.slug, cost()))).toBe('EDITION_ARCHIVED');
    expect((await listCosts(owner, f.slug))[0].amountCents).toBe(15_000);
  });

  it('si annullano senza cancellarli: la riga resta, esce dai totali, va nel registro', async () => {
    const f = await createEdition();
    const a = await createCost(owner, f.slug, cost({ category: 'Noleggi', amountCents: 10_000 }));
    await createCost(owner, f.slug, cost({ category: 'SIAE e permessi', amountCents: 5_000 }));
    expect(await errorCode(voidCost(owner, a.id, ''))).toBe('ZOD');
    await voidCost(owner, a.id, 'Fattura doppia');

    const rows = await listCosts(owner, f.slug);
    expect(rows).toHaveLength(2);
    const voided = rows.find((r) => r.id === a.id)!;
    expect(voided.voidedAt).not.toBeNull();
    expect(voided.voidReason).toBe('Fattura doppia');
    expect(await errorCode(updateCost(owner, a.id, cost()))).toBe('CONFLICT');

    expect(await editionCostTotals(f.edition.id)).toEqual({ byCategory: [{ category: 'SIAE e permessi', cents: 5_000 }], totalCents: 5_000 });
    const log = await getDb().select().from(auditLog).where(eq(auditLog.entityId, a.id));
    expect(log.map((l) => l.action).sort()).toEqual(['cost.created', 'cost.voided']);
  });

  it('saldo: entrate nette meno costi, per edizione e per anno con i costi generali', async () => {
    const f = await createEdition();
    const o = await createOrder(anon, { editionId: f.edition.id, channel: 'online', customer: buyer, lines: [{ productId: f.ticket.id, quantity: 4, sessionId: f.day2.id }], idempotencyKey: key() });
    await recordPayment(system, { orderId: o.id, method: 'nexi', amountCents: 2_000, status: 'succeeded', providerRef: `costi-${o.id}` });
    await createCost(owner, f.slug, cost({ amountCents: 700 }));
    const voided = await createCost(owner, f.slug, cost({ amountCents: 99_999 }));
    await voidCost(owner, voided.id, 'Sbagliato');
    await createCost(owner, null, cost({ spentOn: '2026-03-01', category: 'Assicurazioni', amountCents: 300 }));

    const income = (await editionTotals(f.edition.id)).netCents;
    expect(income).toBe(2_000);
    expect(income - (await editionCostTotals(f.edition.id)).totalCents).toBe(1_300);

    const y = (await yearlySummary(owner)).find((s) => s.year === 2026)!;
    const row = y.editions.find((e) => e.slug === f.slug)!;
    expect(row).toMatchObject({ incomeCents: 2_000, costCents: 700 });
    expect(y.generalCostCents).toBeGreaterThanOrEqual(300);
    expect(y.balanceCents).toBe(y.incomeCents - y.costCents);
  });

  it('permessi: l’event_manager scrive i costi della sua edizione, non quelli generali né di altre', async () => {
    const f = await createEdition();
    const other = await createEdition();
    const em = roleOn('event_manager', f.slug);
    await createCost(em, f.slug, cost());
    expect(await errorCode(createCost(em, other.slug, cost()))).toBe('FORBIDDEN');
    expect(await errorCode(createCost(em, null, cost()))).toBe('FORBIDDEN');
    expect(await errorCode(listCosts(roleOn('editor', null), null))).toBe('FORBIDDEN');
    expect(await errorCode(createItem(em, { name: 'Gazebo', category: 'Gazebo e tende', condition: 'good', quantity: 1 }))).toBe('FORBIDDEN');
  });
});

describe.skipIf(!enabled)('inventario', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('la quantità è sempre la somma delle rettifiche; gli usi impegnano e i mancanti escono', async () => {
    const f = await createEdition({ status: 'concluded' });
    const { id } = await createItem(owner, { name: 'Gazebo 3x3', category: 'Gazebo e tende', condition: 'good', quantity: 10, location: 'Magazzino comunale' });
    await adjustItem(owner, id, { kind: 'broken', quantity: 1, reason: 'Telo strappato' });
    await adjustItem(owner, id, { kind: 'added', quantity: 3, reason: 'Acquisto' });
    expect(await errorCode(adjustItem(owner, id, { kind: 'lost', quantity: 50, reason: 'Troppi' }))).toBe('VALIDATION');

    const use = await assignToEdition(owner, id, { editionId: f.edition.id, quantity: 8 });
    expect(await errorCode(assignToEdition(owner, id, { editionId: f.edition.id, quantity: 5 }))).toBe('VALIDATION');
    let item = (await listItems(owner)).find((i) => i.id === id)!;
    expect(item).toMatchObject({ quantity: 12, out: 8, available: 4 });

    expect(await errorCode(returnFromEdition(owner, use.id, { returnedQuantity: 6 }))).toBe('VALIDATION');
    expect(await returnFromEdition(owner, use.id, { returnedQuantity: 6, reason: 'Non trovati a fine serata' })).toEqual({ missing: 2 });
    expect(await errorCode(returnFromEdition(owner, use.id, { returnedQuantity: 6 }))).toBe('CONFLICT');

    item = (await listItems(owner)).find((i) => i.id === id)!;
    expect(item).toMatchObject({ quantity: 10, out: 0, available: 10 });
    const moves = await getDb().select().from(inventoryMovements).where(eq(inventoryMovements.itemId, id));
    const balance = moves.filter((m) => m.kind !== 'event_use').reduce((s, m) => s + m.quantity, 0);
    expect(balance).toBe(item.quantity);

    const used = await editionMaterials(owner, f.slug);
    expect(used).toEqual([expect.objectContaining({ itemName: 'Gazebo 3x3', quantity: 8, returnedQuantity: 6, missing: 2 })]);
  });

  it('il materiale si dismette (non si cancella) e un’edizione archiviata non riceve materiale', async () => {
    const archived = await createEdition({ status: 'archived' });
    const { id } = await createItem(owner, { name: 'Prolunga', category: 'Elettrico e luci', condition: 'needs_repair', quantity: 2 });
    expect(await errorCode(assignToEdition(owner, id, { editionId: archived.edition.id, quantity: 1 }))).toBe('EDITION_ARCHIVED');
    await dismissItem(owner, id, 'Buttata, cavo bruciato');
    expect((await listItems(owner)).some((i) => i.id === id)).toBe(false);
    const [row] = await getDb().select().from(inventoryItems).where(eq(inventoryItems.id, id));
    expect(row.dismissReason).toBe('Buttata, cavo bruciato');
    expect(await errorCode(adjustItem(owner, id, { kind: 'added', quantity: 1, reason: 'Ripresa' }))).toBe('CONFLICT');
  });

  it('un acquisto in costi può puntare al materiale', async () => {
    const { id } = await createItem(owner, { name: 'Friggitrice', category: 'Cucina', condition: 'good', quantity: 1 });
    const c = await createCost(owner, null, cost({ category: 'Materiali', inventoryItemId: id }));
    const [row] = await getDb().select().from(costs).where(eq(costs.id, c.id));
    expect(row.inventoryItemId).toBe(id);
    expect((await listCosts(owner, null)).find((r) => r.id === c.id)?.inventoryItemName).toBe('Friggitrice');
  });

  describe('ricevute private', () => {
    const receipt = { publicId: 'pro-loco-gasperina/costi/abc123', resourceType: 'image' as const, format: 'jpg' };
    const views = (id: string) => getDb().select().from(auditLog).where(eq(auditLog.entityId, id));

    it('si salva il public_id, mai un URL; un URL pubblico o un public_id fuori cartella non si accettano', async () => {
      const f = await createEdition();
      const { id } = await createCost(owner, f.slug, cost({ attachment: receipt }));
      const [row] = await getDb().select().from(costs).where(eq(costs.id, id));
      expect(row).toMatchObject({ attachmentPublicId: receipt.publicId, attachmentResourceType: 'image', attachmentFormat: 'jpg', attachmentUrl: null });
      await updateCost(owner, id, cost({ amountCents: 9_000 }));
      expect((await getDb().select().from(costs).where(eq(costs.id, id)))[0].attachmentPublicId).toBe(receipt.publicId);
      expect(await errorCode(createCost(owner, f.slug, cost({ attachment: { ...receipt, publicId: 'altro/abc' } })))).toBe('ZOD');
      const spoofed = await createCost(owner, f.slug, { ...cost(), attachmentUrl: 'https://res.cloudinary.com/x/raw/upload/r.pdf' } as CostInput);
      expect((await getDb().select().from(costs).where(eq(costs.id, spoofed.id)))[0].attachmentUrl).toBeNull();
      const csv = costsCsv(await listCosts(owner, f.slug));
      expect(csv).not.toContain('cloudinary');
      expect(csv).not.toContain(receipt.publicId);
      await updateCost(owner, id, cost({ attachment: null }));
      expect((await getDb().select().from(costs).where(eq(costs.id, id)))[0].attachmentPublicId).toBeNull();
    });

    it('si apre solo con costs.read sull’edizione del costo, e ogni apertura va nel registro', async () => {
      const f = await createEdition();
      const other = await createEdition();
      const { id } = await createCost(owner, f.slug, cost({ attachment: receipt }));
      expect(await errorCode(openReceipt(roleOn('event_manager', other.slug), id))).toBe('FORBIDDEN');
      expect(await errorCode(openReceipt(roleOn('editor', null), id))).toBe('FORBIDDEN');
      expect(await errorCode(openReceipt(anon, id))).toBe('FORBIDDEN');
      expect((await views(id)).some((a) => a.action === 'cost.receipt_viewed')).toBe(false);

      expect(await openReceipt(roleOn('event_manager', f.slug), id)).toEqual({ private: receipt });
      const logged = (await views(id)).filter((a) => a.action === 'cost.receipt_viewed');
      expect(logged).toHaveLength(1);
      expect(logged[0].editionSlug).toBe(f.slug);
    });

    it('costi generali: serve il permesso a livello di associazione; le ricevute di prima restano leggibili', async () => {
      const f = await createEdition();
      const { id } = await createCost(owner, null, cost());
      await getDb().update(costs).set({ attachmentUrl: 'https://res.cloudinary.com/demo/raw/upload/vecchia.pdf' }).where(eq(costs.id, id));
      expect(await errorCode(openReceipt(roleOn('event_manager', f.slug), id))).toBe('FORBIDDEN');
      expect(await openReceipt(owner, id)).toEqual({ legacyUrl: 'https://res.cloudinary.com/demo/raw/upload/vecchia.pdf' });
      // Modificare il costo senza toccare la ricevuta lascia quella di prima.
      await updateCost(owner, id, cost({ amountCents: 1_000 }));
      expect((await getDb().select().from(costs).where(eq(costs.id, id)))[0].attachmentUrl).toContain('vecchia.pdf');
      const { id: none } = await createCost(owner, null, cost());
      expect(await errorCode(openReceipt(owner, none))).toBe('NOT_FOUND');
    });
  });
});
