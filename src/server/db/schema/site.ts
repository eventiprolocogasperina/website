import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { editions, series } from './catalog';

/**
 * Iscrizioni "Avvisami" della pagina del format fuori stagione (§13.3). Quando un'edizione del
 * format passa a `on_sale` parte un'email a chi è iscritto; `notified_edition_id` ricorda l'ultima
 * edizione annunciata, così l'invio non si ripete. L'iscrizione si annulla con il link nell'email
 * (`unsubscribed_at`), senza cancellare la riga: resta la prova del consenso.
 */
export const notifySignups = pgTable(
  'notify_signups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seriesId: uuid('series_id')
      .notNull()
      .references(() => series.id, { onDelete: 'restrict' }),
    email: text('email').notNull(),
    /** Testo del consenso mostrato al momento dell'iscrizione. */
    consentText: text('consent_text').notNull(),
    consentAt: timestamp('consent_at', { withTimezone: true }).defaultNow().notNull(),
    /** Token casuale del link di disiscrizione: non dà accesso ad altri dati. */
    unsubscribeToken: text('unsubscribe_token').notNull().unique(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    notifiedEditionId: uuid('notified_edition_id').references(() => editions.id, { onDelete: 'set null' }),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('notify_signups_series_email_uq').on(t.seriesId, sql`lower(${t.email})`), index('notify_signups_series_idx').on(t.seriesId)],
);
