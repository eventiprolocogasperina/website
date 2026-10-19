import { sql } from 'drizzle-orm';
import { boolean, check, index, inet, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/*
 * Utenti, ruoli, dispositivi e registro attività (ARCHITETTURA §5.2 e §8, prompt 07).
 *
 * Le edizioni sono indicate con lo slug (`edition_slug`) perché la tabella `editions` arriva con il
 * prompt 08: lì si aggiunge `edition_id` con la chiave esterna e si riempie a partire dallo slug.
 */

export const userRole = pgEnum('user_role', ['owner', 'admin', 'event_manager', 'editor', 'cashier', 'gate']);
export const deviceKind = pgEnum('device_kind', ['pos', 'scanner']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Minuscola. Facoltativa per i volontari che usano solo il PIN. */
    email: text('email'),
    name: text('name').notNull(),
    passwordHash: text('password_hash'),
    pinHash: text('pin_hash'),
    /** Errori di PIN consecutivi; a 5 il PIN si blocca finché un responsabile non lo reimposta. */
    pinFailedAttempts: integer('pin_failed_attempts').default(0).notNull(),
    pinLockedAt: timestamp('pin_locked_at', { withTimezone: true }),
    active: boolean('active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    /** TOTP facoltativo per owner e admin (non ancora attivo). */
    totpSecret: text('totp_secret'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    check('users_email_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
);

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRole('role').notNull(),
    /** NULL = tutta l'associazione. */
    editionSlug: text('edition_slug'),
    ...timestamps,
  },
  (t) => [
    index('role_assignments_user_idx').on(t.userId),
    uniqueIndex('role_assignments_unique').on(t.userId, t.role, sql`coalesce(${t.editionSlug}, '')`),
  ],
);

/** Sessioni dell'admin, per poterle chiudere dal server (logout, utente disattivato). */
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [index('user_sessions_user_idx').on(t.userId)],
);

/** Telefoni e tablet autorizzati per cassa e scanner. */
export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    /** sha256 del token salvato nel cookie del dispositivo. */
    tokenHash: text('token_hash').notNull(),
    editionSlug: text('edition_slug').notNull(),
    kind: deviceKind('kind').notNull(),
    pairedBy: uuid('paired_by').references(() => users.id),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('devices_token_hash_unique').on(t.tokenHash)],
);

/** QR di abbinamento: monouso, valido 10 minuti. */
export const devicePairings = pgTable(
  'device_pairings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    name: text('name').notNull(),
    editionSlug: text('edition_slug').notNull(),
    kind: deviceKind('kind').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    deviceId: uuid('device_id').references(() => devices.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('device_pairings_token_hash_unique').on(t.tokenHash)],
);

/** Registro attività: si scrive soltanto, mai modificato né cancellato (§18). */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorDeviceId: uuid('actor_device_id').references(() => devices.id),
    /** Nome leggibile di chi ha agito, al momento dell'azione. */
    actorLabel: text('actor_label'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    editionSlug: text('edition_slug'),
    before: jsonb('before'),
    after: jsonb('after'),
    reason: text('reason'),
    ip: inet('ip'),
  },
  (t) => [
    index('audit_log_at_idx').on(t.at.desc()),
    index('audit_log_actor_idx').on(t.actorUserId),
    index('audit_log_action_idx').on(t.action),
    index('audit_log_edition_idx').on(t.editionSlug),
    // Cronologia di un ordine o di un rimborso (prompt 12).
    index('audit_log_entity_idx').on(t.entityType, t.entityId),
  ],
);
