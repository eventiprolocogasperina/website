import 'server-only';
import { and, desc, ilike, isNull, or } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { orders } from '@/server/db/schema';

export type OrderSearchResult = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  totalAmount: string;
  createdAt: string | null;
};

const LIMIT = 10;

/** Escape di % e _ per LIKE: la ricerca è sempre "contiene", mai un pattern dell'utente. */
function likeContains(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Cerca ordini per codice, nome, email o telefono (palette ⌘K). Al massimo 10 risultati. */
export async function searchOrders(query: string): Promise<OrderSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = likeContains(q);
  const digits = q.replace(/\D/g, '');
  const conditions = [ilike(orders.id, pattern), ilike(orders.buyerName, pattern), ilike(orders.buyerEmail, pattern)];
  if (digits.length >= 4) conditions.push(ilike(orders.buyerPhone, likeContains(digits)));
  return getDb()
    .select({
      id: orders.id,
      buyerName: orders.buyerName,
      buyerEmail: orders.buyerEmail,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(isNull(orders.deletedAt), or(...conditions)))
    .orderBy(desc(orders.createdAt))
    .limit(LIMIT);
}
