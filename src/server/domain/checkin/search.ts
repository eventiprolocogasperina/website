import 'server-only';
import { and, asc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { checkinLists, checkins, customers, editions, ordersV2, products, ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { ADMITTING_STATUSES, type OrderStatus } from '@/server/domain/payments/status';
import { effectiveSession, listAcceptsProduct } from './rules';
import { assertCanOn, loadSessionGraph } from './scan';

export const SearchInput = z.object({
  checkinListId: z.string().uuid(),
  q: z.string().trim().min(2, 'Scrivi almeno 2 lettere.').max(80),
});

export type SearchOrder = {
  orderId: string;
  code: string;
  holderName: string | null;
  /** false se l'ordine non è pagato, è annullato o è in blacklist: i biglietti non entrano. */
  admitted: boolean;
  /** `checkinId`: il passaggio attivo in questa lista, per annullare l'entrata anche dopo. */
  tickets: Array<{ id: string; productName: string; sessionLabel: string | null; validOn: string | null; inList: boolean; enteredAt: string | null; checkinId: string | null }>;
};

/** Escape dei caratteri jolly di LIKE. */
const like = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Ricerca manuale per chi non ha il QR: per nome (cliente o partecipante), codice ordine o QR scritto
 * a mano. Restituisce nome, prodotto e data, mai email o telefono. Al massimo 15 ordini.
 */
export async function searchTickets(ctx: Ctx, input: z.input<typeof SearchInput>): Promise<SearchOrder[]> {
  const data = SearchInput.parse(input);
  const db = getDb();
  const [list] = await db.select({ list: checkinLists, slug: editions.slug }).from(checkinLists).innerJoin(editions, eq(editions.id, checkinLists.editionId)).where(eq(checkinLists.id, data.checkinListId));
  if (!list) throw new DomainError('NOT_FOUND');
  assertCanOn(ctx, 'checkin.scan', list.slug);
  const editionId = list.list.editionId;
  const q = data.q;
  const code = q.toUpperCase().replace(/^#/, '');

  const matches = await db
    .selectDistinct({ id: ordersV2.id, createdAt: ordersV2.createdAt })
    .from(ordersV2)
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .leftJoin(ticketsV2, eq(ticketsV2.orderId, ordersV2.id))
    .where(
      and(
        eq(ordersV2.editionId, editionId),
        isNull(ordersV2.deletedAt),
        or(ilike(ordersV2.code, `${like(code)}%`), ilike(customers.name, `%${like(q)}%`), ilike(ticketsV2.attendeeName, `%${like(q)}%`), eq(ticketsV2.qrToken, q)),
      ),
    )
    .orderBy(asc(ordersV2.createdAt))
    .limit(15);
  if (!matches.length) return [];
  const ids = matches.map((m) => m.id);

  const [orders, tickets, graph] = await Promise.all([
    db
      .select({ id: ordersV2.id, code: ordersV2.code, status: ordersV2.status, blacklisted: ordersV2.isBlacklisted, name: customers.name })
      .from(ordersV2)
      .leftJoin(customers, eq(customers.id, ordersV2.customerId))
      .where(inArray(ordersV2.id, ids)),
    db
      .select({ t: ticketsV2, productName: products.name })
      .from(ticketsV2)
      .innerJoin(products, eq(products.id, ticketsV2.productId))
      .where(and(inArray(ticketsV2.orderId, ids), eq(ticketsV2.status, 'valid')))
      .orderBy(asc(ticketsV2.createdAt)),
    loadSessionGraph(db, editionId),
  ]);
  const ticketIds = tickets.map((t) => t.t.id);
  const passes = ticketIds.length
    ? await db
        .select({ id: checkins.id, ticketId: checkins.ticketId, at: checkins.at })
        .from(checkins)
        .where(and(inArray(checkins.ticketId, ticketIds), eq(checkins.checkinListId, list.list.id), isNull(checkins.revertedAt)))
    : [];
  const label = (id: string | null) => (id ? (graph.get(id)?.label ?? null) : null);

  return ids
    .map((id) => orders.find((o) => o.id === id)!)
    .map((o) => ({
      orderId: o.id,
      code: o.code,
      holderName: o.name,
      admitted: ADMITTING_STATUSES.includes(o.status as OrderStatus) && !o.blacklisted,
      tickets: tickets
        .filter((t) => t.t.orderId === o.id)
        .map((t) => {
          const pass = passes.find((p) => p.ticketId === t.t.id);
          return {
            id: t.t.id,
            productName: t.productName,
            sessionLabel: label(t.t.sessionId),
            validOn: label(effectiveSession(graph, t.t.sessionId)),
            inList: listAcceptsProduct(list.list, t.t.productId),
            enteredAt: pass?.at.toISOString() ?? null,
            checkinId: pass?.id ?? null,
          };
        }),
    }));
}
