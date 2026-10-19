// "Esaurita" automatica (§9): un'edizione in vendita passa a sold_out quando nessun biglietto
// d'ingresso online ha più posti nelle date future, e torna in vendita se un posto si libera.
import { channelAllows } from '@/server/domain/pricing/cart';
import type { Availability } from '@/server/domain/quotas/availability';

type P = { id: string; kind: string; active: boolean; channels: string[]; requiresSession: boolean };
type S = { id: string; status: string; startsAt: Date };

/**
 * true = esaurita, false = ci sono posti, null = non si può dire (nessun biglietto online o nessuna
 * data futura): in quel caso lo stato non si tocca, ci pensa chi gestisce l'edizione.
 */
export function isSoldOut(products: P[], sessions: S[], availability: Pick<Availability, 'products'>, now: Date): boolean | null {
  const tickets = products.filter((p) => p.active && p.kind === 'ticket' && channelAllows(p as never, 'online'));
  const future = sessions.filter((s) => (s.status === 'open' || s.status === 'sold_out') && s.startsAt.getTime() > now.getTime()).map((s) => s.id);
  const slots: Array<number | null> = [];
  for (const p of tickets) {
    for (const sessionId of p.requiresSession ? future : [null]) {
      const a = availability.products.find((x) => x.productId === p.id && x.sessionId === sessionId);
      slots.push(a ? a.remaining : null);
    }
  }
  if (!slots.length) return null;
  return slots.every((r) => r === 0);
}
