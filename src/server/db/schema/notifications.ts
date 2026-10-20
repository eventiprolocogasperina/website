import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { editions } from './catalog';
import { ordersV2 } from './orders';

/*
 * Notifiche, email e sistema (prompt 18). I modelli predefiniti stanno nel codice
 * (`src/server/domain/email-templates/defaults.ts`): qui solo le versioni modificate da admin.
 * Registri degli invii (email e WhatsApp): solo aggiunte, mai cancellazioni; nessun indirizzo o
 * numero in chiaro, solo mascherato.
 */

/** Modello email personalizzato: globale (edition_id NULL) o di un'edizione, che vince sul globale. */
export const emailTemplates = pgTable(
  'email_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 'confirmation' | 'postponement' | 'thank_you' | 'paylink' | 'refund_update' | 'notify_me'. */
    key: text('key').notNull(),
    editionId: uuid('edition_id').references(() => editions.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('email_templates_key_edition_unique').on(t.key, t.editionId).nullsNotDistinct()],
);

/** Registro degli invii email: destinatario mascherato, modello, esito di Resend. */
export const emailLog = pgTable(
  'email_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateKey: text('template_key'),
    editionId: uuid('edition_id').references(() => editions.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => ordersV2.id),
    /** Es. "m***@example.com": mai l'indirizzo intero. */
    recipientMasked: text('recipient_masked').notNull(),
    subject: text('subject').notNull(),
    /** 'sent' (Resend ha accettato) | 'outbox' (sviluppo, dev/outbox) | 'failed'. */
    status: text('status').notNull(),
    /** ID del messaggio su Resend. */
    providerId: text('provider_id'),
    error: text('error'),
    /** Invio di prova dall'editor dei modelli. */
    isTest: boolean('is_test').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('email_log_created_idx').on(t.createdAt), index('email_log_order_idx').on(t.orderId)],
);

/** Raggruppamento degli allarmi di errore: al massimo un messaggio ogni 10 minuti per tipo. */
export const alertThrottle = pgTable('alert_throttle', {
  key: text('key').primaryKey(),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true }).notNull(),
  /** Errori dello stesso tipo non inviati dall'ultimo messaggio. */
  suppressed: integer('suppressed').default(0).notNull(),
});

/** Un invio WhatsApp a un segmento (modulo broadcast). */
export const whatsappBroadcasts = pgTable(
  'whatsapp_broadcasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    editionId: uuid('edition_id')
      .notNull()
      .references(() => editions.id),
    /** Chiave dell'invio scelta dal browser: un doppio clic non manda due volte gli stessi messaggi. */
    requestId: uuid('request_id').notNull().unique(),
    templateName: text('template_name').notNull(),
    /** Filtri del segmento (data, ingresso): mai i destinatari. */
    segment: jsonb('segment').$type<Record<string, unknown>>().notNull(),
    recipients: integer('recipients').notNull(),
    sent: integer('sent').default(0).notNull(),
    failed: integer('failed').default(0).notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('whatsapp_broadcasts_edition_idx').on(t.editionId, t.createdAt)],
);

/** Messaggio WhatsApp di un invio: lo stato lo aggiorna il webhook di Meta. */
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => whatsappBroadcasts.id),
    orderCode: text('order_code').notNull(),
    /** Es. "***567". */
    phoneMasked: text('phone_masked').notNull(),
    /** ID del messaggio su Meta (wamid), NULL se l'invio è fallito subito. */
    waMessageId: text('wa_message_id').unique(),
    /** 'accepted' | 'sent' | 'delivered' | 'read' | 'failed'. */
    status: text('status').notNull(),
    error: text('error'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('whatsapp_messages_broadcast_idx').on(t.broadcastId)],
);
