import { index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { editions } from './catalog';

/**
 * Controlli della checklist di chiusura saltati da un owner o admin (§9). Uno per controllo:
 * togliere il salto riporta il controllo allo stato calcolato; entrambe le azioni vanno nel registro.
 */
export const editionClosingSkips = pgTable(
  'edition_closing_skips',
  {
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    /** 'core:<chiave>' oppure '<modulo>:<chiave>'. */
    checkKey: text('check_key').notNull(),
    reason: text('reason').notNull(),
    skippedBy: uuid('skipped_by').references(() => users.id),
    skippedAt: timestamp('skipped_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.editionId, t.checkKey] })],
);

/**
 * Rendiconti finali dell'edizione (CSV e PDF). Restano nel database e non su Cloudinary: i link di
 * Cloudinary sono pubblici e il rendiconto contiene gli incassi. Si scaricano solo dall'admin.
 */
export const editionReports = pgTable(
  'edition_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    /** Numeri principali al momento della generazione, per mostrarli senza riaprire i file. */
    summary: jsonb('summary').$type<Record<string, number>>().notNull(),
    csv: text('csv').notNull(),
    pdfBase64: text('pdf_base64').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('edition_reports_edition_idx').on(t.editionId, t.createdAt.desc())],
);
