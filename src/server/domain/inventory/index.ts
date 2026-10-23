import 'server-only';
// Inventario del materiale dell'associazione. La quantità posseduta cambia solo con i movimenti di
// rettifica (aggiunta, perso, rotto, correzione); gli usi per evento la "impegnano" finché non rientra.
// Niente cancellazioni: il materiale si dismette, i movimenti restano.
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ADJUSTMENT_KINDS, adjustmentDelta, INVENTORY_CONDITIONS } from '@/lib/costs';
import type { Ctx } from '@/server/auth/context-shared';
import { can, canSomewhere } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { editions, inventoryItems, inventoryMovements, users } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
const QTY = z.number().int('Scrivi un numero intero.');

export const ItemInput = z.object({
  name: z.string().trim().min(1, 'Scrivi il nome del materiale.').max(200),
  category: z.string().trim().min(1, 'Scegli una categoria.').max(80),
  unit: z.string().trim().min(1).max(20).default('pz'),
  location: optionalText(200),
  condition: z.enum(INVENTORY_CONDITIONS),
  purchasedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.')
    .nullish()
    .transform((v) => v || null),
  purchaseValueCents: z.number().int().min(0).max(100_000_000).nullish().transform((v) => v ?? null),
  notes: optionalText(2000),
  photoUrl: z
    .url({ protocol: /^https$/, message: 'Foto non valida.' })
    .nullish()
    .transform((v) => v || null),
});
export type ItemInput = z.input<typeof ItemInput>;

export type ItemRow = typeof inventoryItems.$inferSelect & { out: number; available: number };
export type EditionMaterial = {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  returnedAt: Date | null;
  returnedQuantity: number | null;
  missing: number;
  reason: string | null;
};

const allowed = (ctx: Ctx, write: boolean) => (write ? can(ctx, 'inventory.write') : canSomewhere(ctx, 'inventory.read'));
function assertInventory(ctx: Ctx, write = false) {
  if (!allowed(ctx, write)) throw new DomainError('FORBIDDEN');
}

/** Pezzi fuori per eventi e non ancora rientrati. */
const outSql = sql<number>`coalesce((select sum(m.quantity) from inventory_movements m where m.item_id = "inventory_items"."id" and m.kind = 'event_use' and m.returned_at is null), 0)::int`;

export async function listItems(ctx: Ctx, opts: { dismissed?: boolean } = {}): Promise<ItemRow[]> {
  assertInventory(ctx);
  const rows = await getDb()
    .select({ i: inventoryItems, out: outSql })
    .from(inventoryItems)
    .where(opts.dismissed ? undefined : isNull(inventoryItems.dismissedAt))
    .orderBy(asc(inventoryItems.category), asc(inventoryItems.name));
  return rows.map((r) => ({ ...r.i, out: r.out, available: r.i.quantity - r.out }));
}

export async function itemMovements(ctx: Ctx, itemId: string) {
  assertInventory(ctx);
  return getDb()
    .select({ m: inventoryMovements, editionTitle: editions.title, editionSlug: editions.slug, by: users.name })
    .from(inventoryMovements)
    .leftJoin(editions, eq(editions.id, inventoryMovements.editionId))
    .leftJoin(users, eq(users.id, inventoryMovements.createdBy))
    .where(eq(inventoryMovements.itemId, itemId))
    .orderBy(desc(inventoryMovements.createdAt));
}

async function itemForWrite(tx: Tx, id: string) {
  const [row] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, id)).for('update');
  if (!row) throw new DomainError('NOT_FOUND');
  if (row.dismissedAt) throw new DomainError('CONFLICT', { message: 'Il materiale è dismesso.' });
  return row;
}

export async function createItem(ctx: Ctx, input: ItemInput & { quantity: number }): Promise<{ id: string }> {
  assertInventory(ctx, true);
  const data = ItemInput.parse(input);
  const quantity = QTY.min(0, 'La quantità non può essere negativa.').parse(input.quantity);
  return withTransaction(async (tx) => {
    const [row] = await tx
      .insert(inventoryItems)
      .values({ ...data, quantity, createdBy: ctx.user?.id ?? null })
      .returning();
    if (quantity > 0) await tx.insert(inventoryMovements).values({ itemId: row.id, kind: 'added', quantity, reason: 'Inserimento iniziale', createdBy: ctx.user?.id ?? null });
    await audit(tx, ctx, 'inventory.item_created', { entityType: 'inventory_item', entityId: row.id, after: row });
    return { id: row.id };
  });
}

/** Dati del materiale; la quantità cambia solo con una rettifica. */
export async function updateItem(ctx: Ctx, id: string, input: ItemInput): Promise<void> {
  assertInventory(ctx, true);
  const data = ItemInput.parse(input);
  await withTransaction(async (tx) => {
    const before = await itemForWrite(tx, id);
    const [after] = await tx
      .update(inventoryItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    await audit(tx, ctx, 'inventory.item_updated', { entityType: 'inventory_item', entityId: id, before, after });
  });
}

export async function dismissItem(ctx: Ctx, id: string, reason: string): Promise<void> {
  assertInventory(ctx, true);
  const why = z.string().trim().min(3, 'Scrivi perché lo dismetti.').max(300).parse(reason);
  await withTransaction(async (tx) => {
    await itemForWrite(tx, id);
    await tx.update(inventoryItems).set({ dismissedAt: new Date(), dismissReason: why, updatedAt: new Date() }).where(eq(inventoryItems.id, id));
    await audit(tx, ctx, 'inventory.item_dismissed', { entityType: 'inventory_item', entityId: id, reason: why });
  });
}

async function applyDelta(tx: Tx, item: typeof inventoryItems.$inferSelect, delta: number) {
  const quantity = item.quantity + delta;
  if (quantity < 0) throw new DomainError('VALIDATION', { message: `Non puoi togliere più di ${item.quantity} ${item.unit}.` });
  await tx.update(inventoryItems).set({ quantity, updatedAt: new Date() }).where(eq(inventoryItems.id, item.id));
  return quantity;
}

export const AdjustInput = z.object({
  kind: z.enum(ADJUSTMENT_KINDS),
  quantity: QTY.refine((q) => q !== 0, 'La quantità non può essere zero.'),
  reason: z.string().trim().min(3, 'Scrivi il motivo.').max(300),
});

/** Rettifica: aggiunta, perso, rotto o correzione, sempre con il motivo. */
export async function adjustItem(ctx: Ctx, id: string, input: z.input<typeof AdjustInput>): Promise<{ quantity: number }> {
  assertInventory(ctx, true);
  const data = AdjustInput.parse(input);
  const delta = adjustmentDelta(data.kind, data.quantity);
  return withTransaction(async (tx) => {
    const item = await itemForWrite(tx, id);
    const quantity = await applyDelta(tx, item, delta);
    await tx.insert(inventoryMovements).values({ itemId: id, kind: data.kind, quantity: delta, reason: data.reason, createdBy: ctx.user?.id ?? null });
    await audit(tx, ctx, 'inventory.adjusted', { entityType: 'inventory_item', entityId: id, before: { quantity: item.quantity }, after: { quantity }, reason: data.reason });
    return { quantity };
  });
}

async function editionForMaterials(tx: Tx, editionId: string) {
  const [e] = await tx.select({ id: editions.id, slug: editions.slug, status: editions.status }).from(editions).where(eq(editions.id, editionId));
  if (!e) throw new DomainError('NOT_FOUND');
  if (e.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
  return e;
}

export const AssignInput = z.object({
  editionId: z.uuid('Scegli l’edizione.'),
  quantity: QTY.positive('Almeno un pezzo.'),
  reason: optionalText(300),
});

/** "Porta a un evento": impegna dei pezzi disponibili per un'edizione (non archiviata). */
export async function assignToEdition(ctx: Ctx, itemId: string, input: z.input<typeof AssignInput>): Promise<{ id: string }> {
  assertInventory(ctx, true);
  const data = AssignInput.parse(input);
  return withTransaction(async (tx) => {
    const item = await itemForWrite(tx, itemId);
    const e = await editionForMaterials(tx, data.editionId);
    const [{ out }] = await tx
      .select({ out: sql<number>`coalesce(sum(${inventoryMovements.quantity}), 0)::int` })
      .from(inventoryMovements)
      .where(and(eq(inventoryMovements.itemId, itemId), eq(inventoryMovements.kind, 'event_use'), isNull(inventoryMovements.returnedAt)));
    const available = item.quantity - out;
    if (data.quantity > available) throw new DomainError('VALIDATION', { message: `Disponibili solo ${available} ${item.unit}.` });
    const [m] = await tx
      .insert(inventoryMovements)
      .values({ itemId, kind: 'event_use', quantity: data.quantity, editionId: e.id, reason: data.reason, createdBy: ctx.user?.id ?? null })
      .returning({ id: inventoryMovements.id });
    await audit(tx, ctx, 'inventory.assigned', { entityType: 'inventory_item', entityId: itemId, edition: e.slug, after: { quantity: data.quantity } });
    return m;
  });
}

/**
 * "Segna rientrato": quanti pezzi sono tornati. I mancanti escono dall'inventario con una rettifica
 * `lost` collegata a questo uso, così il rendiconto dell'evento mostra cosa manca.
 */
export async function returnFromEdition(ctx: Ctx, movementId: string, input: { returnedQuantity: number; reason?: string | null }): Promise<{ missing: number }> {
  assertInventory(ctx, true);
  const returned = QTY.min(0).parse(input.returnedQuantity);
  return withTransaction(async (tx) => {
    const [m] = await tx.select().from(inventoryMovements).where(eq(inventoryMovements.id, movementId)).for('update');
    if (!m || m.kind !== 'event_use') throw new DomainError('NOT_FOUND');
    if (m.returnedAt) throw new DomainError('CONFLICT', { message: 'Il materiale è già rientrato.' });
    if (returned > m.quantity) throw new DomainError('VALIDATION', { message: `Erano usciti ${m.quantity} pezzi.` });
    const e = await editionForMaterials(tx, m.editionId!);
    const item = await itemForWrite(tx, m.itemId);
    const missing = m.quantity - returned;
    const reason = z.string().trim().max(300).nullish().parse(input.reason) || null;
    if (missing > 0 && !reason) throw new DomainError('VALIDATION', { message: 'Scrivi cosa è successo ai pezzi mancanti.' });
    await tx.update(inventoryMovements).set({ returnedAt: new Date(), returnedQuantity: returned }).where(eq(inventoryMovements.id, movementId));
    if (missing > 0) {
      await applyDelta(tx, item, -missing);
      await tx.insert(inventoryMovements).values({ itemId: item.id, kind: 'lost', quantity: -missing, editionId: e.id, fromMovementId: m.id, reason, createdBy: ctx.user?.id ?? null });
    }
    await audit(tx, ctx, 'inventory.returned', { entityType: 'inventory_item', entityId: item.id, edition: e.slug, after: { returned, missing }, reason });
    return { missing };
  });
}

/** "Materiale usato" di un'edizione: cosa è uscito, cosa è rientrato, cosa manca. */
export async function editionMaterials(ctx: Ctx, slug: string): Promise<EditionMaterial[]> {
  if (!can(ctx, 'inventory.read', { edition: slug }) && !can(ctx, 'costs.read', { edition: slug })) throw new DomainError('FORBIDDEN');
  const rows = await getDb()
    .select({ m: inventoryMovements, itemName: inventoryItems.name, unit: inventoryItems.unit })
    .from(inventoryMovements)
    .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryMovements.itemId))
    .innerJoin(editions, eq(editions.id, inventoryMovements.editionId))
    .where(and(eq(editions.slug, slug), eq(inventoryMovements.kind, 'event_use')))
    .orderBy(asc(inventoryItems.name));
  return rows.map(({ m, itemName, unit }) => ({
    id: m.id,
    itemId: m.itemId,
    itemName,
    unit,
    quantity: m.quantity,
    returnedAt: m.returnedAt,
    returnedQuantity: m.returnedQuantity,
    missing: m.returnedAt ? m.quantity - (m.returnedQuantity ?? 0) : 0,
    reason: m.reason,
  }));
}
