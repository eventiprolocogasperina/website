import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { moduleSettings } from '@/modules/registry';
import type { ActivitiesSettings } from '@/modules/activities/module';
import { publicCtx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { discountsV2, editions, legacyIdMap, ordersV2, products, sessions } from '@/server/db/schema';
import { getAvailability } from '@/server/domain/catalog';
import { DomainError } from '@/server/domain/errors';
import { createOrder, type OrderResult } from '@/server/domain/orders';
import { channelAllows, priceCart, type PricedCart } from '@/server/domain/pricing/cart';
import { legacySoldCounts } from '@/server/domain/quotas/legacy-sold';

/** Stati in cui la pagina d'acquisto si apre (negli altri: 404). Vende solo in on_sale e live. */
const VISIBLE = ['published', 'on_sale', 'sold_out', 'live'] as const;
const SELLING = ['on_sale', 'live'];

export type CheckoutSession = { id: string; label: string; startsAt: string; status: string; remaining: number | null; low: boolean; open: boolean };
export type CheckoutProduct = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  priceCents: number;
  requiresSession: boolean;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  /** Posti residui per data (chiave '' se il prodotto non richiede la data). null = senza limite. */
  remaining: Record<string, number | null>;
};
export type CheckoutActivities = Pick<ActivitiesSettings, 'askChildren' | 'labProductId' | 'remindIfMissing' | 'questions'> & {
  activities: Array<Pick<ActivitiesSettings['activities'][number], 'key' | 'label' | 'details' | 'target' | 'sessionIds' | 'maxPlaces'>>;
};
export type CheckoutView = {
  edition: { id: string; slug: string; title: string; status: string; location: string | null; coverImage: string | null; startsAt: string | null };
  /** Vende ora? Se no, `closedReason` dice perché. */
  selling: boolean;
  closedReason: string | null;
  sessions: CheckoutSession[];
  products: CheckoutProduct[];
  timeSlots: boolean;
  showRemaining: boolean;
  activities: CheckoutActivities | null;
};

type TimeSlotSettings = { showRemaining: boolean; lowThreshold: number; closeMinutesBefore: number };

/**
 * Un'edizione non ancora migrata (prompt 10) vende ancora dalle pagine di oggi: i posti venduti lì
 * non passano da reserveSeats, quindi il checkout nuovo resta chiuso per non vendere due volte lo stesso posto.
 */
async function sellsFromLegacyPages(editionId: string): Promise<boolean> {
  const [migrated] = await getDb()
    .select({ id: legacyIdMap.newId })
    .from(legacyIdMap)
    .innerJoin(ordersV2, eq(ordersV2.id, legacyIdMap.newId))
    .where(and(eq(ordersV2.editionId, editionId), inArray(legacyIdMap.legacyKind, ['order', 'cashier_order', 'booking'])))
    .limit(1);
  if (migrated) return false;
  return [...(await legacySoldCounts(editionId)).values()].some((n) => n > 0);
}

/** La data chiude la vendita online `closeMinutesBefore` minuti prima dell'inizio. */
const sessionOpen = (s: { status: string; startsAt: Date }, t: TimeSlotSettings, now: Date) =>
  s.status === 'open' && s.startsAt.getTime() - t.closeMinutesBefore * 60_000 > now.getTime();

/** Tutto quello che serve alla pagina /acquista/[edition]: catalogo online, posti residui, passi dei moduli. */
export async function getCheckout(slug: string, now = new Date()): Promise<CheckoutView | null> {
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.slug, slug));
  if (!edition || !(VISIBLE as readonly string[]).includes(edition.status)) return null;
  const [sessionRows, productRows] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt), asc(sessions.sort)),
    db.select().from(products).where(eq(products.editionId, edition.id)).orderBy(asc(products.sort), asc(products.name)),
  ]);
  const online = productRows.filter((p) => p.active && channelAllows(p, 'online'));
  const availability = await getAvailability(edition.id);
  const timeSlots = edition.enabledModules.includes('time-slots');
  const ts = moduleSettings('time-slots', edition.moduleSettings) as TimeSlotSettings;

  // Capienza della data = minimo tra i posti dei biglietti d'ingresso in quella data.
  const sessionRemaining = (id: string) => {
    const r = availability.sessions.find((s) => s.id === id)?.remaining;
    return r === undefined ? null : r;
  };
  const shownSessions = sessionRows
    .filter((s) => s.status !== 'cancelled' && s.startsAt.getTime() > now.getTime() - 12 * 3600_000)
    .map((s) => {
      const remaining = sessionRemaining(s.id);
      return {
        id: s.id,
        label: s.label,
        startsAt: s.startsAt.toISOString(),
        status: remaining === 0 && s.status === 'open' ? 'sold_out' : s.status,
        remaining,
        low: remaining !== null && remaining <= ts.lowThreshold,
        open: sessionOpen(s, ts, now) && remaining !== 0,
      };
    });

  let closedReason: string | null = null;
  if (!SELLING.includes(edition.status)) closedReason = edition.status === 'sold_out' ? 'I biglietti sono esauriti.' : 'La vendita dei biglietti non è ancora aperta.';
  else if (!online.length) closedReason = 'Per questo evento non ci sono biglietti in vendita online.';
  else if (await sellsFromLegacyPages(edition.id)) closedReason = 'I biglietti di questa edizione si acquistano ancora dalla pagina dell’evento.';
  else if (online.some((p) => p.requiresSession) && !shownSessions.some((s) => s.open)) closedReason = 'Non ci sono più date in vendita.';

  let activities: CheckoutActivities | null = null;
  if (edition.enabledModules.includes('activities')) {
    const a = moduleSettings('activities', edition.moduleSettings) as ActivitiesSettings;
    activities = {
      askChildren: a.askChildren,
      labProductId: a.labProductId,
      remindIfMissing: a.remindIfMissing,
      questions: a.questions,
      activities: a.activities.map(({ key, label, details, target, sessionIds, maxPlaces }) => ({ key, label, details, target, sessionIds, maxPlaces })),
    };
  }

  return {
    edition: {
      id: edition.id,
      slug: edition.slug,
      title: edition.title,
      status: edition.status,
      location: edition.location,
      coverImage: edition.coverImage,
      startsAt: edition.startsAt?.toISOString() ?? null,
    },
    selling: closedReason === null,
    closedReason,
    sessions: shownSessions,
    products: online.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      kind: p.kind,
      priceCents: p.priceCents,
      requiresSession: p.requiresSession,
      minPerOrder: p.minPerOrder,
      maxPerOrder: p.maxPerOrder,
      remaining: Object.fromEntries(availability.products.filter((x) => x.productId === p.id).map((x) => [x.sessionId ?? '', x.remaining])),
    })),
    timeSlots,
    showRemaining: ts.showRemaining,
    activities,
  };
}

const CartInput = z.object({
  editionId: z.string().uuid(),
  sessionId: z.string().uuid().nullish(),
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1, 'Il carrello è vuoto.').max(30),
  discountCode: z.string().trim().toUpperCase().max(40).nullish(),
});
export type CartInput = z.input<typeof CartInput>;

export type Quote = {
  lines: Array<{ productId: string; name: string; quantity: number; unitPriceCents: number; discountCents: number; totalCents: number }>;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  discountCode: string | null;
};

/**
 * Riepilogo del carrello calcolato dal server con priceCart (il client mostra solo questo).
 * Non riserva nulla: i posti si controllano di nuovo, bloccati, quando si crea l'ordine.
 */
export async function quoteCart(input: CartInput, now = new Date()): Promise<Quote> {
  const data = CartInput.parse(input);
  const db = getDb();
  const [edition] = await db.select({ id: editions.id }).from(editions).where(eq(editions.id, data.editionId));
  if (!edition) throw new DomainError('NOT_FOUND');
  const [catalog, sessionRows] = await Promise.all([
    db.select().from(products).where(eq(products.editionId, edition.id)),
    db.select({ id: sessions.id, status: sessions.status }).from(sessions).where(eq(sessions.editionId, edition.id)),
  ]);
  let discount = null;
  if (data.discountCode) {
    [discount] = await db.select().from(discountsV2).where(eq(discountsV2.code, data.discountCode));
    if (!discount) throw new DomainError('DISCOUNT_INVALID');
  }
  const priced: PricedCart = priceCart({ editionId: edition.id, channel: 'online', lines: data.lines, products: catalog, sessions: sessionRows, sessionId: data.sessionId, discount, now });
  return {
    lines: priced.lines.map((l) => ({
      productId: l.productId,
      name: catalog.find((p) => p.id === l.productId)!.name,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      discountCents: l.discountCents,
      totalCents: l.totalCents,
    })),
    subtotalCents: priced.subtotalCents,
    discountCents: priced.discountCents,
    totalCents: priced.totalCents,
    discountCode: priced.discountId ? (data.discountCode ?? null) : null,
  };
}

export const PlaceOrderInput = CartInput.extend({
  customer: z.object({
    name: z.string().trim().min(2, 'Scrivi nome e cognome.').max(120),
    email: z.string().trim().email('Email non valida.').max(200),
    phone: z.string().trim().max(30).nullish(),
    marketingConsent: z.boolean().default(false),
  }),
  privacyConsent: z.literal(true, { error: 'Per comprare serve il consenso al trattamento dei dati.' }),
  answers: z.array(z.object({ questionKey: z.string().trim().min(1).max(60), value: z.unknown() })).max(40).default([]),
  idempotencyKey: z.string().trim().min(8).max(100),
  expectedTotalCents: z.number().int().min(0),
});
export type PlaceOrderInput = z.input<typeof PlaceOrderInput>;

/**
 * Crea l'ordine online in attesa di pagamento (15 minuti di posto tenuto, §5.4).
 * Prezzi e posti li decide createOrder; qui solo i controlli propri del sito pubblico.
 */
export async function placeOrder(ip: string | null, input: PlaceOrderInput, now = new Date()): Promise<OrderResult & { edition: string }> {
  const data = PlaceOrderInput.parse(input);
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.id, data.editionId));
  if (!edition) throw new DomainError('NOT_FOUND');
  if (await sellsFromLegacyPages(edition.id)) throw new DomainError('SALES_CLOSED', { message: 'I biglietti di questa edizione si acquistano ancora dalla pagina dell’evento.' });
  if (data.sessionId) {
    const [s] = await db.select({ status: sessions.status, startsAt: sessions.startsAt }).from(sessions).where(and(eq(sessions.id, data.sessionId), eq(sessions.editionId, edition.id)));
    const ts = moduleSettings('time-slots', edition.moduleSettings) as TimeSlotSettings;
    if (s && s.status === 'open' && !sessionOpen(s, ts, now)) throw new DomainError('SALES_CLOSED', { message: 'La vendita online per questa data è chiusa.' });
  }
  const result = await createOrder(
    publicCtx(ip),
    {
      editionId: edition.id,
      channel: 'online',
      sessionId: data.sessionId ?? null,
      lines: data.lines,
      customer: { ...data.customer, phone: data.customer.phone || null },
      answers: data.answers,
      discountCode: data.discountCode ?? null,
      idempotencyKey: data.idempotencyKey,
      expectedTotalCents: data.expectedTotalCents,
    },
    { now },
  );
  return { ...result, edition: edition.slug };
}
