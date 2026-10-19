import 'server-only';
import { and, asc, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, type Tx } from '@/server/db/client';
import { attendeeAnswers, editions, orderLines, ordersV2, products, sessions } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { moduleSettings } from '../registry';
import { ANSWER_KEYS, type ActivitiesSettings } from './module';
import { activityProblem, normalizeChoice, placesTaken, readChoice, type ActivityChoice } from './rules';

type Db = Tx | ReturnType<typeof getDb>;
type OrderChoice = { orderId: string; sessionId: string | null; admissions: number; choice: ActivityChoice };

/** Scelte degli ordini che occupano posti (pagati, rimborsati in parte, in attesa non scaduti). */
async function activeChoices(db: Db, editionId: string, now: Date, sessionId?: string | null): Promise<OrderChoice[]> {
  const orders = await db
    .select({ id: ordersV2.id, sessionId: ordersV2.sessionId })
    .from(ordersV2)
    .where(
      and(
        eq(ordersV2.editionId, editionId),
        isNull(ordersV2.deletedAt),
        sessionId ? eq(ordersV2.sessionId, sessionId) : undefined,
        or(inArray(ordersV2.status, ['paid', 'partially_refunded']), and(eq(ordersV2.status, 'pending'), or(isNull(ordersV2.expiresAt), gt(ordersV2.expiresAt, now)))),
      ),
    );
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const [answers, lines] = await Promise.all([
    db
      .select({ orderId: attendeeAnswers.orderId, questionKey: attendeeAnswers.questionKey, value: attendeeAnswers.value })
      .from(attendeeAnswers)
      .where(and(inArray(attendeeAnswers.orderId, ids), inArray(attendeeAnswers.questionKey, [ANSWER_KEYS.children, ANSWER_KEYS.activities]))),
    db
      .select({ orderId: orderLines.orderId, quantity: orderLines.quantity })
      .from(orderLines)
      .innerJoin(products, eq(products.id, orderLines.productId))
      .where(and(inArray(orderLines.orderId, ids), eq(products.kind, 'ticket'))),
  ]);
  return orders.map((o) => ({
    orderId: o.id,
    sessionId: o.sessionId,
    admissions: lines.filter((l) => l.orderId === o.id).reduce((s, l) => s + l.quantity, 0),
    choice: readChoice(answers.filter((a) => a.orderId === o.id)),
  }));
}

function usedPlaces(settings: ActivitiesSettings, choices: OrderChoice[]): Map<string, number> {
  const used = new Map<string, number>();
  for (const c of choices) {
    for (const key of normalizeChoice(settings, c.choice).activities) {
      const a = settings.activities.find((x) => x.key === key);
      if (a) used.set(key, (used.get(key) ?? 0) + placesTaken(a.target, c.choice, c.admissions));
    }
  }
  return used;
}

/**
 * Controllo dell'ordine nuovo (punto di estensione `validate` del checkout), dentro la transazione
 * di createOrder. Le date con capienza sono già bloccate da reserveSeats, quindi due ordini sullo
 * stesso giorno non superano insieme i posti di un'attività.
 */
export async function validateActivities(
  tx: Tx,
  edition: { id: string; moduleSettings: Record<string, unknown> },
  order: { sessionId: string | null; admissions: number; answers: Array<{ questionKey: string; value: unknown }>; now: Date },
): Promise<void> {
  const choice = readChoice(order.answers);
  if (choice.children === null && !choice.activities.length) return;
  const settings = moduleSettings('activities', edition.moduleSettings) as ActivitiesSettings;
  const used = choice.activities.length ? usedPlaces(settings, await activeChoices(tx, edition.id, order.now, order.sessionId)) : new Map();
  const problem = activityProblem(settings, { sessionId: order.sessionId, admissions: order.admissions, choice, used });
  if (problem) throw new DomainError('VALIDATION', { message: problem });
}

export type ActivityDay = {
  sessionId: string;
  label: string;
  status: string;
  orders: number;
  admissions: number;
  children: number;
  activities: Array<{ key: string; label: string; used: number; maxPlaces: number }>;
};

/** Conteggi per giorno per lo staff: ingressi, bambini e posti di ogni attività. */
export async function activityCounts(ctx: Ctx, slug: string, now = new Date()): Promise<{ days: ActivityDay[]; settings: ActivitiesSettings }> {
  if (!can(ctx, 'orders.read', { edition: slug })) throw new DomainError('FORBIDDEN');
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.slug, slug));
  if (!edition) throw new DomainError('NOT_FOUND');
  const settings = moduleSettings('activities', edition.moduleSettings) as ActivitiesSettings;
  const [days, choices] = await Promise.all([
    db.select({ id: sessions.id, label: sessions.label, status: sessions.status }).from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
    activeChoices(db, edition.id, now),
  ]);
  return {
    settings,
    days: days.map((d) => {
      const here = choices.filter((c) => c.sessionId === d.id);
      const used = usedPlaces(settings, here);
      return {
        sessionId: d.id,
        label: d.label,
        status: d.status,
        orders: here.length,
        admissions: here.reduce((s, c) => s + c.admissions, 0),
        children: here.reduce((s, c) => s + (c.choice.children ?? 0), 0),
        activities: settings.activities
          .filter((a) => !a.sessionIds.length || a.sessionIds.includes(d.id))
          .map((a) => ({ key: a.key, label: a.label, used: used.get(a.key) ?? 0, maxPlaces: a.maxPlaces })),
      };
    }),
  };
}
