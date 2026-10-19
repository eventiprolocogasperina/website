import { sql } from 'drizzle-orm';
import { type AnyPgColumn, boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { devices, users } from './auth';
import { discountsV2, editions, products, sessions } from './catalog';

/*
 * Nucleo ordini (ARCHITETTURA §5.2–§5.4, prompt 09): clienti, ordini, righe, biglietti, pagamenti,
 * rimborsi, liste e passaggi di check-in, risposte dei partecipanti.
 *
 * `orders_v2`, `tickets_v2` e `refunds_v2` convivono con le tabelle di oggi finché il prompt 19 non le
 * rinomina. Ordini, pagamenti e rimborsi non si cancellano mai (§18): niente ON DELETE CASCADE.
 */

export const orderStatus = pgEnum('order_status', ['pending', 'paid', 'partially_refunded', 'refunded', 'cancelled', 'expired']);
export const orderChannel = pgEnum('order_channel', ['online', 'pos', 'paylink', 'invite', 'admin']);
export const ticketStatus = pgEnum('ticket_status', ['valid', 'void']);
export const paymentMethod = pgEnum('payment_method', ['nexi', 'cash', 'card_pos', 'complimentary', 'bank_transfer']);
export const paymentStatus = pgEnum('payment_status', ['pending', 'succeeded', 'failed']);
export const refundStatus = pgEnum('refund_status', ['requested', 'approved', 'paid', 'rejected']);
/** `card_pos` e `complimentary`: storno di un contributo annullato in cassa, con lo stesso metodo del pagamento (prompt 14). */
export const refundMethod = pgEnum('refund_method', ['bank_transfer', 'nexi', 'cash', 'card_pos', 'complimentary']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Minuscola. */
    email: text('email').notNull(),
    name: text('name'),
    phone: text('phone'),
    marketingConsent: boolean('marketing_consent').default(false).notNull(),
    consentAt: timestamp('consent_at', { withTimezone: true }),
    notes: text('notes'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('customers_email_unique').on(t.email), check('customers_email_lowercase', sql`${t.email} = lower(${t.email})`)],
);

export const ordersV2 = pgTable(
  'orders_v2',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Codice leggibile, es. "ZC26-7F3K". */
    code: text('code').notNull(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    customerId: uuid('customer_id').references(() => customers.id),
    channel: orderChannel('channel').notNull(),
    status: orderStatus('status').notNull(),
    /** Data scelta per l'ordine, se l'edizione ne ha. Le righe possono indicarne una propria. */
    sessionId: uuid('session_id').references(() => sessions.id),
    /** Data scelta all'acquisto, se poi l'ordine è stato spostato da un rinvio. Serve per il diritto al rimborso al secondo rinvio. */
    originalSessionId: uuid('original_session_id').references(() => sessions.id),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    discountId: uuid('discount_id').references(() => discountsV2.id),
    /** Turno di cassa (`cash_sessions`, prompt 14). */
    cashSessionId: uuid('cash_session_id'),
    operatorId: uuid('operator_id').references(() => users.id),
    deviceId: uuid('device_id').references(() => devices.id),
    /** Integrazione: ordine aggiunto a un ordine già pagato (orders/addLines). */
    parentOrderId: uuid('parent_order_id').references((): AnyPgColumn => ordersV2.id),
    /** Per "I miei biglietti": chi ha il link vede l'ordine. */
    accessToken: text('access_token').notNull(),
    /** Chiave inviata dal client: lo stesso ordine non si crea due volte. */
    idempotencyKey: text('idempotency_key'),
    /** Testo originale delle note del vecchio sistema (migrazione del prompt 10). */
    legacyNotes: text('legacy_notes'),
    isBlacklisted: boolean('is_blacklisted').default(false).notNull(),
    blacklistReason: text('blacklist_reason'),
    /** Scadenza degli ordini online in attesa di pagamento. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('orders_v2_code_unique').on(t.code),
    uniqueIndex('orders_v2_access_token_unique').on(t.accessToken),
    uniqueIndex('orders_v2_idempotency_unique').on(t.idempotencyKey),
    index('orders_v2_edition_status_idx').on(t.editionId, t.status),
    index('orders_v2_customer_idx').on(t.customerId),
    index('orders_v2_expiry_idx').on(t.expiresAt).where(sql`${t.status} = 'pending'`),
    check('orders_v2_total', sql`${t.totalCents} = ${t.subtotalCents} - ${t.discountCents} AND ${t.totalCents} >= 0 AND ${t.discountCents} >= 0`),
  ],
);

export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersV2.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sessionId: uuid('session_id').references(() => sessions.id),
    quantity: integer('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    discountCents: integer('discount_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    department: text('department'),
    prepStatus: text('prep_status'),
    ...timestamps,
  },
  (t) => [
    index('order_lines_order_idx').on(t.orderId),
    index('order_lines_product_session_idx').on(t.productId, t.sessionId),
    check('order_lines_quantity', sql`${t.quantity} > 0`),
    check('order_lines_total', sql`${t.totalCents} = ${t.unitPriceCents} * ${t.quantity} - ${t.discountCents} AND ${t.totalCents} >= 0`),
  ],
);

export const ticketsV2 = pgTable(
  'tickets_v2',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersV2.id),
    orderLineId: uuid('order_line_id')
      .notNull()
      .references(() => orderLines.id),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sessionId: uuid('session_id').references(() => sessions.id),
    qrToken: text('qr_token').notNull(),
    attendeeName: text('attendee_name'),
    status: ticketStatus('status').default('valid').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('tickets_v2_qr_unique').on(t.qrToken), index('tickets_v2_order_idx').on(t.orderId), index('tickets_v2_edition_idx').on(t.editionId)],
);

export const checkinLists = pgTable(
  'checkin_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    name: text('name').notNull(),
    /** Prodotti ammessi. Vuoto = tutti i biglietti dell'edizione. */
    productIds: uuid('product_ids').array().default(sql`'{}'::uuid[]`).notNull(),
    /** Se indicata, la lista accetta solo i biglietti di quella data. */
    sessionId: uuid('session_id').references(() => sessions.id),
    allowMultiple: boolean('allow_multiple').default(false).notNull(),
    ...timestamps,
  },
  (t) => [index('checkin_lists_edition_idx').on(t.editionId)],
);

export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => ticketsV2.id),
    checkinListId: uuid('checkin_list_id')
      .notNull()
      .references(() => checkinLists.id),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    operatorId: uuid('operator_id').references(() => users.id),
    deviceId: uuid('device_id').references(() => devices.id),
    revertedAt: timestamp('reverted_at', { withTimezone: true }),
    revertedBy: uuid('reverted_by').references(() => users.id),
  },
  (t) => [index('checkins_ticket_list_idx').on(t.ticketId, t.checkinListId)],
);

export const attendeeAnswers = pgTable(
  'attendee_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersV2.id),
    ticketId: uuid('ticket_id').references(() => ticketsV2.id),
    questionKey: text('question_key').notNull(),
    value: jsonb('value').notNull(),
    ...timestamps,
  },
  (t) => [index('attendee_answers_order_idx').on(t.orderId)],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersV2.id),
    method: paymentMethod('method').notNull(),
    amountCents: integer('amount_cents').notNull(),
    status: paymentStatus('status').notNull(),
    /** Riferimento del gestore (codTrans di Nexi): un callback ricevuto due volte non crea due pagamenti. */
    providerRef: text('provider_ref'),
    raw: jsonb('raw'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    cashSessionId: uuid('cash_session_id'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('payments_provider_ref_unique').on(t.providerRef),
    index('payments_order_idx').on(t.orderId),
    index('payments_cash_session_idx').on(t.cashSessionId),
    check('payments_amount', sql`${t.amountCents} >= 0`),
  ],
);

export const refundsV2 = pgTable(
  'refunds_v2',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersV2.id),
    amountCents: integer('amount_cents').notNull(),
    reason: text('reason'),
    method: refundMethod('method').notNull(),
    status: refundStatus('status').default('requested').notNull(),
    /** IBAN cifrato con AES-256-GCM (REFUND_ENCRYPTION_KEY). Mai in chiaro, mai nei log. */
    ibanEncrypted: text('iban_encrypted'),
    holderName: text('holder_name'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processedBy: uuid('processed_by').references(() => users.id),
    /** Turno di cassa da cui sono usciti i soldi (annullo in cassa, prompt 14). */
    cashSessionId: uuid('cash_session_id'),
    ...timestamps,
  },
  (t) => [index('refunds_v2_order_idx').on(t.orderId), index('refunds_v2_status_idx').on(t.status), check('refunds_v2_amount', sql`${t.amountCents} > 0`)],
);
