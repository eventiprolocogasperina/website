import 'server-only';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { customers, editions, ordersV2, sessions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { likeEscape } from '@/server/domain/orders/admin-list';

// Clienti nell'admin (prompt 12): elenco, scheda con lo storico di tutte le edizioni, note e consensi,
// unione dei doppioni. Lettura con `customers.read`; le modifiche anche con `orders.edit`.

export const CUSTOMERS_PAGE_SIZE = 50;
const uuid = z.string().uuid();

function assertRead(ctx: Ctx) {
  if (!can(ctx, 'customers.read')) throw new DomainError('FORBIDDEN');
}
function assertEdit(ctx: Ctx) {
  if (!can(ctx, 'customers.read') || !can(ctx, 'orders.edit')) throw new DomainError('FORBIDDEN');
}

const PAID = sql`${ordersV2.status} in ('paid', 'partially_refunded')`;

/**
 * Un cliente unito a un altro non si cancella e i suoi ordini non si toccano (possono essere di
 * edizioni archiviate, §18.7): punta a quello buono con `merged_into_id`, e lo storico del cliente
 * buono legge gli ordini di entrambi.
 */
const ownerId = sql<string>`coalesce(${customers.mergedIntoId}, ${customers.id})`;

export type CustomerListRow = { id: string; name: string | null; email: string; phone: string | null; marketingConsent: boolean; orders: number; paidCents: number; lastOrderAt: string | null };

export async function listCustomers(ctx: Ctx, f: { q: string; page: number }): Promise<{ rows: CustomerListRow[]; total: number }> {
  assertRead(ctx);
  const db = getDb();
  const q = f.q ? `%${likeEscape(f.q)}%` : null;
  const where = and(isNull(customers.mergedIntoId), isNull(customers.deletedAt), q ? or(ilike(customers.name, q), ilike(customers.email, q), ilike(customers.phone, q)) : undefined);
  // Ordini aggregati per cliente "buono" (anche quelli dei doppioni uniti).
  const stats = db
    .select({
      owner: ownerId.as('owner'),
      orders: sql<number>`count(${ordersV2.id})::int`.as('orders'),
      paid: sql<number>`coalesce(sum(${ordersV2.totalCents}) filter (where ${PAID}), 0)::int`.as('paid'),
      last: sql<Date | null>`max(${ordersV2.createdAt})`.as('last'),
    })
    .from(customers)
    .innerJoin(ordersV2, and(eq(ordersV2.customerId, customers.id), isNull(ordersV2.deletedAt)))
    .groupBy(ownerId)
    .as('stats');
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, email: customers.email, phone: customers.phone, marketingConsent: customers.marketingConsent, orders: stats.orders, paidCents: stats.paid, lastOrderAt: stats.last })
      .from(customers)
      .leftJoin(stats, eq(stats.owner, customers.id))
      .where(where)
      .orderBy(sql`${stats.last} desc nulls last`, asc(customers.email))
      .limit(CUSTOMERS_PAGE_SIZE)
      .offset(f.page * CUSTOMERS_PAGE_SIZE),
    db.select({ n: count() }).from(customers).where(where),
  ]);
  return {
    total: n,
    rows: rows.map((r) => ({ ...r, orders: Number(r.orders ?? 0), paidCents: Number(r.paidCents ?? 0), lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt).toISOString() : null })),
  };
}

export type CustomerDetail = Awaited<ReturnType<typeof getCustomer>>;

export async function getCustomer(ctx: Ctx, id: string) {
  assertRead(ctx);
  const db = getDb();
  const [c] = await db.select().from(customers).where(eq(customers.id, uuid.parse(id)));
  if (!c) throw new DomainError('NOT_FOUND');
  const merged = await db.select({ id: customers.id, email: customers.email, name: customers.name }).from(customers).where(eq(customers.mergedIntoId, c.id));
  const ids = [c.id, ...merged.map((m) => m.id)];
  const orders = await db
    .select({
      id: ordersV2.id,
      code: ordersV2.code,
      status: ordersV2.status,
      channel: ordersV2.channel,
      totalCents: ordersV2.totalCents,
      createdAt: ordersV2.createdAt,
      isBlacklisted: ordersV2.isBlacklisted,
      editionSlug: editions.slug,
      editionTitle: editions.title,
      sessionLabel: sessions.label,
      customerId: ordersV2.customerId,
    })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .leftJoin(sessions, eq(sessions.id, ordersV2.sessionId))
    .where(and(inArray(ordersV2.customerId, ids), isNull(ordersV2.deletedAt)))
    .orderBy(desc(ordersV2.createdAt));
  const [into] = c.mergedIntoId ? await db.select({ id: customers.id, email: customers.email }).from(customers).where(eq(customers.id, c.mergedIntoId)) : [];
  return {
    customer: {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      notes: c.notes,
      marketingConsent: c.marketingConsent,
      consentAt: c.consentAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      mergedInto: into ?? null,
    },
    merged,
    orders: orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), viaEmail: o.customerId === c.id ? null : (merged.find((m) => m.id === o.customerId)?.email ?? null) })),
    paidCents: orders.filter((o) => o.status === 'paid' || o.status === 'partially_refunded').reduce((s, o) => s + o.totalCents, 0),
    canEdit: can(ctx, 'orders.edit'),
  };
}

export const UpdateCustomerAdminInput = z.object({
  id: uuid,
  name: z.string().trim().min(2, 'Scrivi nome e cognome.').max(120).nullish(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[\d\s.-]{6,}$/, 'Telefono non valido.')
    .nullish()
    .or(z.literal('').transform(() => null)),
  notes: z.string().trim().max(5000).nullish(),
  /** L'admin può solo togliere il consenso (su richiesta del cliente), non darlo al suo posto. */
  revokeConsent: z.boolean().default(false),
});

export async function updateCustomer(ctx: Ctx, input: z.input<typeof UpdateCustomerAdminInput>): Promise<void> {
  assertEdit(ctx);
  const data = UpdateCustomerAdminInput.parse(input);
  await withTransaction(async (tx) => {
    const [c] = await tx.select().from(customers).where(eq(customers.id, data.id)).for('update');
    if (!c) throw new DomainError('NOT_FOUND');
    const next = {
      name: data.name === undefined ? c.name : data.name,
      phone: data.phone === undefined ? c.phone : data.phone,
      notes: data.notes === undefined ? c.notes : data.notes || null,
      marketingConsent: data.revokeConsent ? false : c.marketingConsent,
      consentAt: data.revokeConsent ? null : c.consentAt,
    };
    await tx.update(customers).set({ ...next, updatedAt: new Date() }).where(eq(customers.id, c.id));
    await audit(tx, ctx, 'customer.updated', {
      entityType: 'customer',
      entityId: c.id,
      before: { name: c.name, phone: c.phone, notesChanged: false, marketingConsent: c.marketingConsent },
      after: { name: next.name, phone: next.phone, notesChanged: next.notes !== c.notes, marketingConsent: next.marketingConsent },
    });
  });
}

export const MergeCustomersInput = z.object({
  /** Il doppione, che sparisce dall'elenco. */
  sourceId: uuid,
  /** Il cliente che resta. */
  targetId: uuid,
  /** L'email del doppione, scritta per conferma. */
  confirmEmail: z.string().trim().toLowerCase().max(200),
});

/**
 * Unisce due clienti che sono la stessa persona (due email). Il doppione resta nel database con
 * `merged_into_id` (anche i clienti già uniti a lui passano al cliente buono); il cliente buono
 * prende nome e telefono se gli mancano. Gli ordini non cambiano.
 */
export async function mergeCustomers(ctx: Ctx, input: z.input<typeof MergeCustomersInput>): Promise<void> {
  assertEdit(ctx);
  const data = MergeCustomersInput.parse(input);
  if (data.sourceId === data.targetId) throw new DomainError('VALIDATION', { message: 'Scegli due clienti diversi.' });
  await withTransaction(async (tx) => {
    const rows = await tx.select().from(customers).where(inArray(customers.id, [data.sourceId, data.targetId])).orderBy(asc(customers.id)).for('update');
    const source = rows.find((r) => r.id === data.sourceId);
    const target = rows.find((r) => r.id === data.targetId);
    if (!source || !target) throw new DomainError('NOT_FOUND');
    if (source.mergedIntoId || target.mergedIntoId) throw new DomainError('CONFLICT', { message: 'Uno dei due clienti è già stato unito a un altro.' });
    if (data.confirmEmail !== source.email) throw new DomainError('VALIDATION', { message: `Per confermare scrivi l’email del doppione (${source.email}).` });
    const now = new Date();
    await tx.update(customers).set({ mergedIntoId: target.id, updatedAt: now }).where(eq(customers.mergedIntoId, source.id));
    await tx.update(customers).set({ mergedIntoId: target.id, deletedAt: now, updatedAt: now }).where(eq(customers.id, source.id));
    await tx
      .update(customers)
      .set({
        name: target.name ?? source.name,
        phone: target.phone ?? source.phone,
        notes: [target.notes, source.notes ? `Da ${source.email}: ${source.notes}` : null].filter(Boolean).join('\n\n') || null,
        updatedAt: now,
      })
      .where(eq(customers.id, target.id));
    await audit(tx, ctx, 'customer.merged', {
      entityType: 'customer',
      entityId: target.id,
      before: { source: { id: source.id, email: source.email }, target: { id: target.id, email: target.email } },
      after: { mergedIntoId: target.id },
    });
  });
}
