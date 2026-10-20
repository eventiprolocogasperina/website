import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';

/*
 * Pagina Trasparenza (§13.6, prompt 17): versioni pubblicate dei contenuti e richieste degli interessati.
 * Le versioni non si modificano: ogni salvataggio ne aggiunge una, così resta lo storico.
 */

export const transparencyVersions = pgTable(
  'transparency_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Contenuto validato da `TransparencyContent` (src/lib/public/transparency.ts). */
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    /** Cosa è cambiato, mostrato nello storico pubblico. */
    note: text('note').notNull(),
    publishedByUserId: uuid('published_by_user_id').references(() => users.id),
    publishedByLabel: text('published_by_label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('transparency_versions_created_idx').on(t.createdAt)],
);

/** Richiesta di esercizio dei diritti (artt. 15-22 GDPR) arrivata dal modulo di /trasparenza. Non si cancella. */
export const privacyRequests = pgTable(
  'privacy_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** access, rectification, erasure, restriction, portability, objection, other. */
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message'),
    /** new, in_progress, done, rejected. */
    status: text('status').default('new').notNull(),
    /** Nota interna di chi l'ha gestita (cosa è stato fatto, quando si è risposto). */
    resolutionNote: text('resolution_note'),
    handledByUserId: uuid('handled_by_user_id').references(() => users.id),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('privacy_requests_status_idx').on(t.status, t.createdAt),
    check('privacy_requests_kind', sql`${t.kind} IN ('access','rectification','erasure','restriction','portability','objection','other')`),
    check('privacy_requests_status', sql`${t.status} IN ('new','in_progress','done','rejected')`),
  ],
);
