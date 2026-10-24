// Calcolo dei posti residui (§5.2): la disponibilità di un prodotto in una data è il minimo tra
// le quote che lo contengono, compresa la capienza della data. Funzioni pure, testate.

export type AvailabilityProduct = { id: string; kind: string; requiresSession: boolean; active: boolean };
export type AvailabilitySession = { id: string; capacity: number | null; status: string };
export type AvailabilityQuota = { id: string; size: number; sessionId: string | null; productIds: string[] };

/** Venduti (pagati + in attesa non scaduti) per prodotto e data. Chiave: `${productId}|${sessionId ?? ''}`. */
export type SoldCounts = Map<string, number>;

export const soldKey = (productId: string, sessionId: string | null) => `${productId}|${sessionId ?? ''}`;

export type QuotaUsage = { id: string; size: number; used: number; remaining: number };
export type ProductAvailability = {
  productId: string;
  sessionId: string | null;
  /** null = nessun limite. */
  remaining: number | null;
  /** La quota che limita (quella con meno posti), se c'è. */
  limitedBy: string | null;
};
export type Availability = {
  quotas: QuotaUsage[];
  sessions: Array<{ id: string; capacity: number | null; used: number; remaining: number | null }>;
  products: ProductAvailability[];
};

/** La capienza di una data conta i biglietti d'ingresso (prodotti "ticket" che richiedono la data). */
export const countsTowardCapacity = (p: AvailabilityProduct) => p.kind === 'ticket' && p.requiresSession;

/** Una quota implicita per ogni data con capienza. */
export function sessionQuotaId(sessionId: string) {
  return `session:${sessionId}`;
}

export function computeAvailability(input: {
  products: AvailabilityProduct[];
  sessions: AvailabilitySession[];
  quotas: AvailabilityQuota[];
  sold: SoldCounts;
}): Availability {
  const { products, sessions, sold } = input;
  const capacityProducts = products.filter(countsTowardCapacity).map((p) => p.id);
  const quotas: AvailabilityQuota[] = [
    ...input.quotas,
    ...sessions.filter((s) => s.capacity !== null).map((s) => ({ id: sessionQuotaId(s.id), size: s.capacity!, sessionId: s.id, productIds: capacityProducts })),
  ];

  const soldFor = (productId: string, sessionId: string | null) => {
    if (sessionId !== null) return sold.get(soldKey(productId, sessionId)) ?? 0;
    // Quota senza data: conta le vendite di tutte le date.
    let n = 0;
    for (const [key, count] of sold) if (key.startsWith(`${productId}|`)) n += count;
    return n;
  };

  const usage = new Map<string, QuotaUsage>();
  for (const q of quotas) {
    const used = q.productIds.reduce((sum, pid) => sum + soldFor(pid, q.sessionId), 0);
    usage.set(q.id, { id: q.id, size: q.size, used, remaining: Math.max(0, q.size - used) });
  }

  const out: ProductAvailability[] = [];
  for (const p of products) {
    const slots: Array<string | null> = p.requiresSession ? sessions.map((s) => s.id) : [null];
    for (const sessionId of slots) {
      let remaining: number | null = null;
      let limitedBy: string | null = null;
      for (const q of quotas) {
        if (!q.productIds.includes(p.id)) continue;
        if (q.sessionId !== null && q.sessionId !== sessionId) continue;
        const r = usage.get(q.id)!.remaining;
        if (remaining === null || r < remaining) {
          remaining = r;
          limitedBy = q.id;
        }
      }
      const session = sessionId ? sessions.find((s) => s.id === sessionId) : null;
      // Una data chiusa, esaurita, annullata o rinviata non vende, qualunque sia la capienza.
      if (!p.active || (session && session.status !== 'open')) {
        remaining = 0;
        limitedBy = null;
      }
      out.push({ productId: p.id, sessionId, remaining, limitedBy });
    }
  }

  return {
    quotas: input.quotas.map((q) => usage.get(q.id)!),
    sessions: sessions.map((s) => {
      const u = usage.get(sessionQuotaId(s.id));
      const used = capacityProducts.reduce((sum, pid) => sum + soldFor(pid, s.id), 0);
      return { id: s.id, capacity: s.capacity, used, remaining: u ? u.remaining : null };
    }),
    products: out,
  };
}
