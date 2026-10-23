import { sql } from 'drizzle-orm';
import { type AnyPgColumn, boolean, check, date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { editions } from './catalog';

/*
 * Costi e inventario dell'associazione. I costi sono voci contabili: non si cancellano mai (§18),
 * si annullano (`voided_at` + motivo). Il materiale si dismette (`dismissed_at`); i movimenti restano.
 * Categoria del costo e del materiale: testo libero validato nel codice (src/lib/costs.ts), così
 * l'elenco cambia senza migrazioni.
 */

export const costPaymentMethod = pgEnum('cost_payment_method', ['cash', 'bank_transfer', 'card', 'other']);
export const inventoryCondition = pgEnum('inventory_condition', ['good', 'needs_repair', 'broken']);
/** `event_use`: materiale portato a un'edizione; gli altri sono rettifiche della quantità posseduta. */
export const inventoryMovementKind = pgEnum('inventory_movement_kind', ['added', 'event_use', 'lost', 'broken', 'correction']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    /** Quantità posseduta: è sempre la somma dei movimenti di rettifica (added, lost, broken, correction). */
    quantity: integer('quantity').default(0).notNull(),
    unit: text('unit').default('pz').notNull(),
    location: text('location'),
    condition: inventoryCondition('condition').default('good').notNull(),
    purchasedOn: date('purchased_on'),
    purchaseValueCents: integer('purchase_value_cents'),
    notes: text('notes'),
    photoUrl: text('photo_url'),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    dismissReason: text('dismiss_reason'),
    createdBy: uuid('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [check('inventory_items_quantity_check', sql`${t.quantity} >= 0`)],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id),
    kind: inventoryMovementKind('kind').notNull(),
    /** event_use: pezzi portati (> 0). Rettifiche: variazione con segno (−2 = due persi). */
    quantity: integer('quantity').notNull(),
    editionId: uuid('edition_id').references(() => editions.id),
    /** Solo event_use: quando è rientrato e quanti pezzi. I mancanti generano una rettifica `lost`. */
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    returnedQuantity: integer('returned_quantity'),
    /** Rettifica nata dal rientro incompleto di questo uso. */
    fromMovementId: uuid('from_movement_id').references((): AnyPgColumn => inventoryMovements.id),
    reason: text('reason'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('inventory_movements_item_idx').on(t.itemId, t.createdAt),
    index('inventory_movements_edition_idx').on(t.editionId),
    check('inventory_movements_event_use_check', sql`${t.kind} <> 'event_use' OR (${t.quantity} > 0 AND ${t.editionId} IS NOT NULL)`),
  ],
);

export const costs = pgTable(
  'costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** null = costo generale dell'associazione. */
    editionId: uuid('edition_id').references(() => editions.id),
    spentOn: date('spent_on').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    supplier: text('supplier'),
    amountCents: integer('amount_cents').notNull(),
    paymentMethod: costPaymentMethod('payment_method').notNull(),
    paid: boolean('paid').default(false).notNull(),
    paidAt: date('paid_at'),
    /** Ricevuta caricata prima delle ricevute private: URL pubblico, resta in sola lettura. */
    attachmentUrl: text('attachment_url'),
    /** Ricevuta o fattura privata su Cloudinary (asset `authenticated`): mai un URL pubblico. */
    attachmentPublicId: text('attachment_public_id'),
    /** `image` o `raw` (i PDF). */
    attachmentResourceType: text('attachment_resource_type'),
    /** Formato delle immagini (jpg, png…); null per i PDF, che hanno l'estensione nel public_id. */
    attachmentFormat: text('attachment_format'),
    notes: text('notes'),
    /** Acquisto di materiale dell'inventario. */
    inventoryItemId: uuid('inventory_item_id').references(() => inventoryItems.id),
    createdBy: uuid('created_by').references(() => users.id),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    ...timestamps,
  },
  (t) => [index('costs_edition_idx').on(t.editionId, t.spentOn), index('costs_spent_on_idx').on(t.spentOn), check('costs_amount_check', sql`${t.amountCents} > 0`)],
);
