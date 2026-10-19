import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { devices, users } from './auth';
import { editions } from './catalog';
import { ordersV2 } from './orders';

/*
 * Cassa (ARCHITETTURA §5.2 e §12.1, prompt 14): casse, turni, dati di cassa degli ordini e contatori.
 *
 * Un contributo venduto in cassa è un ordine `orders_v2` con canale `pos`: qui stanno solo le cose che
 * riguardano la cassa (numero grande, resto, omaggio, annullo, vendita fatta offline). Le scorte sono
 * quote del catalogo (§5.4), nessun caso speciale. Niente si cancella fisicamente: un turno chiuso resta.
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Impostazioni della stampante termica di una cassa (stessa forma di CashierPrinterSettings di oggi). */
export type RegisterPrinterSettings = {
  ticketWidthMm: number;
  charactersPerLine: number;
  autoPrintOnOrder: boolean;
  printCustomerReceipt: boolean;
  printDepartmentSlips: boolean;
  headerTitle?: string;
  footerText?: string;
  showQrCode: boolean;
  autoCutPaper: boolean;
};

/** Casse di un'edizione: "Cassa 1", "Bar". */
export const cashRegisters = pgTable(
  'cash_registers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    name: text('name').notNull(),
    /** Prodotti vendibili da questa cassa. NULL = tutti i prodotti dell'edizione con il canale `pos`. */
    productIds: uuid('product_ids').array(),
    printerSettings: jsonb('printer_settings').$type<RegisterPrinterSettings>(),
    /** La cassa dà il numero progressivo da chiamare (la "cassa principale" di oggi). */
    issuesNumbers: boolean('issues_numbers').default(true).notNull(),
    /** Una cassa spenta non compare sui dispositivi; i turni passati restano. */
    active: boolean('active').default(true).notNull(),
    sort: integer('sort').default(0).notNull(),
    ...timestamps,
  },
  (t) => [index('cash_registers_edition_idx').on(t.editionId), uniqueIndex('cash_registers_edition_name_unique').on(t.editionId, t.name)],
);

/** Taglio (in centesimi) → numero di pezzi contati alla chiusura. */
export type DenominationCount = Record<string, number>;

/** Riepilogo congelato alla chiusura Z: quello che il PDF stampa, sempre uguale nel tempo. */
export type ZTotals = {
  sales: number;
  voided: number;
  flagged: number;
  netCents: number;
  complimentaryCents: number;
  byMethod: Array<{ method: 'cash' | 'card_pos' | 'complimentary'; label: string; count: number; amountCents: number; refundedCents: number; netCents: number }>;
  products: Array<{ productId: string; name: string; quantity: number; amountCents: number }>;
};

/** Turni di cassa: apertura con fondo cassa → vendite → chiusura Z. */
export const cashSessions = pgTable(
  'cash_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    registerId: uuid('register_id')
      .notNull()
      .references(() => cashRegisters.id),
    deviceId: uuid('device_id').references(() => devices.id),
    openedBy: uuid('opened_by').references(() => users.id),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    openingFloatCents: integer('opening_float_cents').notNull(),
    closedBy: uuid('closed_by').references(() => users.id),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    countedCashCents: integer('counted_cash_cents'),
    expectedCashCents: integer('expected_cash_cents'),
    differenceCents: integer('difference_cents'),
    /** Conteggio per taglio alla chiusura (es. {"5000": 3, "200": 7}). */
    denominations: jsonb('denominations').$type<DenominationCount>(),
    /** Numero progressivo della chiusura Z nell'edizione. */
    zReportNumber: integer('z_report_number'),
    zTotals: jsonb('z_totals').$type<ZTotals>(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    index('cash_sessions_edition_idx').on(t.editionId),
    // Una cassa ha al massimo un turno aperto: due telefoni sulla stessa cassa lavorano nello stesso turno.
    uniqueIndex('cash_sessions_one_open_per_register').on(t.registerId).where(sql`${t.closedAt} IS NULL`),
    uniqueIndex('cash_sessions_z_number_unique').on(t.editionId, t.zReportNumber),
    check('cash_sessions_float', sql`${t.openingFloatCents} >= 0`),
  ],
);

/** Dati di cassa di un ordine `pos` (uno per ordine). */
export const cashSales = pgTable(
  'cash_sales',
  {
    orderId: uuid('order_id')
      .primaryKey()
      .references(() => ordersV2.id),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    cashSessionId: uuid('cash_session_id')
      .notNull()
      .references(() => cashSessions.id),
    registerId: uuid('register_id')
      .notNull()
      .references(() => cashRegisters.id),
    /** Numero grande da chiamare ("42"). NULL se la cassa non dà numeri. Può ripartire da capo (nuova giornata). */
    number: integer('number'),
    cashReceivedCents: integer('cash_received_cents'),
    changeCents: integer('change_cents'),
    complimentaryReason: text('complimentary_reason'),
    /** Ora del telefono se la vendita è stata fatta senza rete e sincronizzata dopo. */
    offlineAt: timestamp('offline_at', { withTimezone: true }),
    /** Venduta offline oltre la scorta nota al server: da controllare in admin. */
    oversold: boolean('oversold').default(false).notNull(),
    /** Sincronizzata quando il turno era già chiuso: non è nella chiusura Z, da controllare in admin. */
    afterClose: boolean('after_close').default(false).notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidedBy: uuid('voided_by').references(() => users.id),
    /** Il responsabile che ha autorizzato l'annullo con il suo PIN (pos.void). */
    voidApprovedBy: uuid('void_approved_by').references(() => users.id),
    voidReason: text('void_reason'),
    /** Turno in cui sono usciti i soldi dell'annullo (può essere diverso da quello della vendita). */
    voidCashSessionId: uuid('void_cash_session_id').references(() => cashSessions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('cash_sales_session_idx').on(t.cashSessionId),
    index('cash_sales_edition_number_idx').on(t.editionId, t.number),
    index('cash_sales_flagged_idx').on(t.editionId).where(sql`${t.oversold} OR ${t.afterClose}`),
  ],
);

/** Contatori per edizione: `order_number` (numero da chiamare) e `z_report` (chiusure Z). */
export const cashCounters = pgTable(
  'cash_counters',
  {
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    kind: text('kind').notNull(),
    value: integer('value').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.editionId, t.kind] }), check('cash_counters_kind', sql`${t.kind} IN ('order_number', 'z_report')`)],
);
