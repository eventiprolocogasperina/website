import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/*
 * Format, edizioni, date, catalogo, quote e sconti (ARCHITETTURA §5.2 e §5.3, prompt 08).
 *
 * Lo slug di un'edizione non cambia dopo la creazione: ruoli, dispositivi e registro (prompt 07)
 * vi fanno riferimento con `edition_slug`, e dal prompt 17 compare negli URL pubblici.
 * `discounts_v2` convive con la vecchia `discounts` finché il prompt 19 non la rimuove.
 */

export const editionStatus = pgEnum('edition_status', ['draft', 'published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived', 'suspended']);
export const publicPageMode = pgEnum('public_page_mode', ['generic', 'landing']);
export const sessionStatus = pgEnum('session_status', ['open', 'closed', 'sold_out', 'cancelled', 'postponed']);
export const productKind = pgEnum('product_kind', ['ticket', 'addon', 'food', 'drink', 'merch', 'donation', 'service']);
export const discountKind = pgEnum('discount_kind', ['percent', 'fixed']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Tema di un format: per ora solo il colore del pallino nell'admin (§14.3). */
export type SeriesTheme = { dot?: 'orange' | 'blue' | 'gold' | 'gray' };

export const series = pgTable('series', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  /** Pagina pubblica stabile del format, es. /zuccaland. */
  landingPath: text('landing_path'),
  theme: jsonb('theme').$type<SeriesTheme>().default({}).notNull(),
  /** Blocchi della pagina "fuori stagione" del format (§13.3, §13.4), validati da src/components/public/blocks/schema.ts. */
  pageBlocks: jsonb('page_blocks').$type<unknown[]>().default([]).notNull(),
  ...timestamps,
});

export const editions = pgTable(
  'editions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seriesId: uuid('series_id').references(() => series.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull().unique(),
    year: integer('year'),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    status: editionStatus('status').default('draft').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    location: text('location'),
    coverImage: text('cover_image'),
    /** Categoria nel calendario pubblico /eventi (EVENT_CATEGORIES in src/lib/public/editions.ts). */
    category: text('category'),
    timezone: text('timezone').default('Europe/Rome').notNull(),
    publicPageMode: publicPageMode('public_page_mode').default('generic').notNull(),
    enabledModules: text('enabled_modules').array().default(sql`'{}'::text[]`).notNull(),
    moduleSettings: jsonb('module_settings').$type<Record<string, unknown>>().default({}).notNull(),
    /** Blocchi della pagina pubblica dell'edizione (§13.4): /<format>/<anno> e /<format> in stagione. */
    pageBlocks: jsonb('page_blocks').$type<unknown[]>().default([]).notNull(),
    concludedAt: timestamp('concluded_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('editions_series_idx').on(t.seriesId), check('editions_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    /** Capienza della data: vale come quota sui prodotti di tipo "ticket" che richiedono la data. NULL = nessun limite. */
    capacity: integer('capacity'),
    status: sessionStatus('status').default('open').notNull(),
    /** Data di recupero di una data rinviata (status 'postponed'), es. 10 ottobre → 17 ottobre. */
    rescheduledToSessionId: uuid('rescheduled_to_session_id').references((): AnyPgColumn => sessions.id),
    sort: integer('sort').default(0).notNull(),
    ...timestamps,
  },
  (t) => [index('sessions_edition_idx').on(t.editionId), check('sessions_capacity_positive', sql`${t.capacity} IS NULL OR ${t.capacity} >= 0`)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    kind: productKind('kind').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** Emoji o nome di un'icona. */
    icon: text('icon'),
    priceCents: integer('price_cents').notNull(),
    /** Aliquota IVA in punti percentuali; NULL per i contributi (nessuno scontrino fiscale, §19). */
    vatRate: integer('vat_rate'),
    channels: text('channels').array().default(sql`'{}'::text[]`).notNull(),
    requiresSession: boolean('requires_session').default(false).notNull(),
    issuesTicket: boolean('issues_ticket').default(false).notNull(),
    checkinListIds: uuid('checkin_list_ids').array().default(sql`'{}'::uuid[]`).notNull(),
    department: text('department'),
    active: boolean('active').default(true).notNull(),
    sort: integer('sort').default(0).notNull(),
    minPerOrder: integer('min_per_order'),
    maxPerOrder: integer('max_per_order'),
    ...timestamps,
  },
  (t) => [
    index('products_edition_idx').on(t.editionId),
    check('products_price_positive', sql`${t.priceCents} >= 0`),
    check('products_min_max', sql`${t.minPerOrder} IS NULL OR ${t.maxPerOrder} IS NULL OR ${t.minPerOrder} <= ${t.maxPerOrder}`),
  ],
);

export const quotas = pgTable(
  'quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    size: integer('size').notNull(),
    /** Se indicata, la quota conta solo le vendite di quella data. */
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('quotas_edition_idx').on(t.editionId), check('quotas_size_positive', sql`${t.size} >= 0`)],
);

/** La disponibilità di un prodotto è il minimo tra le quote a cui appartiene. */
export const quotaProducts = pgTable(
  'quota_products',
  {
    quotaId: uuid('quota_id')
      .notNull()
      .references(() => quotas.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.quotaId, t.productId] }), index('quota_products_product_idx').on(t.productId)],
);

export const discountsV2 = pgTable(
  'discounts_v2',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** NULL = codice valido su tutte le edizioni. */
    editionId: uuid('edition_id').references(() => editions.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    kind: discountKind('kind').notNull(),
    /** Percentuale (1–100) oppure importo in centesimi. */
    value: integer('value').notNull(),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').default(0).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    appliesToProductIds: uuid('applies_to_product_ids').array().default(sql`'{}'::uuid[]`).notNull(),
    active: boolean('active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('discounts_v2_code_unique').on(t.code),
    check('discounts_v2_code_upper', sql`${t.code} = upper(${t.code})`),
    check('discounts_v2_value', sql`${t.value} > 0 AND (${t.kind} <> 'percent' OR ${t.value} <= 100)`),
  ],
);

/**
 * Corrispondenza tra gli ID del vecchio sistema e i nuovi (backfill del prompt 08, migrazione del 10).
 * legacy_kind: event, legacy_event_id, cashier_event, ticket_type, zuccaland_day, cashier_item, event_product.
 */
export const legacyIdMap = pgTable(
  'legacy_id_map',
  {
    legacyKind: text('legacy_kind').notNull(),
    legacyId: text('legacy_id').notNull(),
    newId: uuid('new_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.legacyKind, t.legacyId] }), index('legacy_id_map_new_idx').on(t.newId)],
);
