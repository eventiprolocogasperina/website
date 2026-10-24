import 'server-only';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { bookings, legacyIdMap, orders, products, sessions, tickets } from '@/server/db/schema';
import { soldKey, type SoldCounts } from './availability';

/*
 * Adattatore isolato (prompt 08): conta i posti già venduti leggendo le tabelle ATTUALI
 * (orders, tickets, bookings), finché il nucleo ordini del prompt 09 e la migrazione del 10
 * non le sostituiscono. Si appoggia a legacy_id_map, scritta dal backfill.
 *
 * - Zuccaland: stessi conteggi di /api/zuccaland/availability (ingressi pagati per giorno).
 * - Eventi del calendario: prenotazioni confermate più biglietti pagati.
 * - Cassa: non conta nulla. La scorta salvata nella configurazione è già quella residua, quindi
 *   la quota creata dal backfill parte da lì.
 */
export async function legacySoldCounts(editionId: string): Promise<SoldCounts> {
  const db = getDb();
  const sold: SoldCounts = new Map();
  const [prodRows, sessRows] = await Promise.all([
    db.select({ id: products.id, kind: products.kind }).from(products).where(eq(products.editionId, editionId)),
    db.select({ id: sessions.id }).from(sessions).where(eq(sessions.editionId, editionId)),
  ]);
  const ids = [...prodRows.map((p) => p.id), ...sessRows.map((s) => s.id)];
  if (!ids.length) return sold;
  const map = await db.select().from(legacyIdMap).where(inArray(legacyIdMap.newId, ids));
  const byKind = (kind: string) => map.filter((m) => m.legacyKind === kind);

  // Zuccaland: giorni e tipi di biglietto.
  const days = byKind('zuccaland_day');
  const types = byKind('ticket_type');
  if (days.length && types.length) {
    const { getZuccalandDateCounts } = await import('@/lib/data/tickets');
    const counts = await getZuccalandDateCounts();
    const typeProducts = prodRows.filter((p) => types.some((t) => t.newId === p.id));
    const admission = typeProducts.find((p) => p.kind === 'ticket');
    const extras = typeProducts.filter((p) => p.kind !== 'ticket');
    for (const d of days) {
      const c = counts[d.legacyId.split(':').pop() as keyof typeof counts];
      if (!c) continue;
      if (admission) sold.set(soldKey(admission.id, d.newId), c.admissionTickets);
      // I vecchi conteggi non distinguono gli extra tra loro: si attribuiscono al primo.
      if (extras[0]) sold.set(soldKey(extras[0].id, d.newId), Math.max(0, c.totalTickets - c.admissionTickets));
    }
  }

  // Eventi del calendario: un prodotto e una data per evento.
  const eventProducts = byKind('event_product');
  const eventSessions = byKind('event_session');
  for (const p of eventProducts) {
    const session = eventSessions.find((s) => s.legacyId === p.legacyId);
    const [b] = await db
      .select({ n: sql<number>`coalesce(sum(${bookings.partecipanti}), 0)::int` })
      .from(bookings)
      .where(and(eq(bookings.eventId, p.legacyId), ne(bookings.stato, 'annullato')));
    const [t] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tickets)
      .innerJoin(orders, eq(orders.id, tickets.orderId))
      .where(and(eq(tickets.eventId, p.legacyId), eq(orders.status, 'PAID'), sql`${orders.deletedAt} IS NULL`));
    sold.set(soldKey(p.newId, session?.newId ?? null), b.n + t.n);
  }
  return sold;
}
