import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { ordersV2 } from './orders';

/*
 * Tabelle di lavoro dell'admin (prompt 12): note interne sugli ordini e viste salvate degli elenchi.
 * Le note non si modificano e non si cancellano: sono parte della storia dell'ordine.
 */

export const orderNotes = pgTable(
  'order_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersV2.id),
    authorUserId: uuid('author_user_id').references(() => users.id),
    /** Nome di chi ha scritto, al momento della nota. */
    authorLabel: text('author_label').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('order_notes_order_idx').on(t.orderId, t.createdAt)],
);

/** Vista salvata di un elenco (filtri nell'URL), per utente. Le viste predefinite sono nel codice. */
export const savedViews = pgTable(
  'admin_saved_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    /** Elenco a cui appartiene: 'orders'. */
    scope: text('scope').notNull(),
    name: text('name').notNull(),
    /** Query string dei filtri, senza pagina (es. "stato=pending&canale=online"). */
    query: text('query').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('admin_saved_views_name_unique').on(t.userId, t.scope, t.name)],
);
