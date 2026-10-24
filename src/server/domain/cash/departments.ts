import 'server-only';
import { and, asc, eq, gt, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { moduleSettings } from '@/modules/registry';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction } from '@/server/db/client';
import { cashSales, editions, orderLines, ordersV2, products } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { lockOrder, requireModule } from '@/server/domain/orders/shared';
import { assertCanOn } from './shared';

/** Colonne dello schermo reparto (§12.2). */
export const PREP_STATUSES = ['pending', 'preparing', 'ready', 'delivered'] as const;
export type PrepStatus = (typeof PREP_STATUSES)[number];

/** Comande più vecchie di così non compaiono più (schermo pulito tra una giornata e l'altra). */
const WINDOW_MS = 12 * 60 * 60_000;
/** I "Pronti" restano a schermo per 20 minuti, poi si presume che siano stati ritirati. */
const READY_WINDOW_MS = 20 * 60_000;

export type DepartmentTicket = {
  orderId: string;
  number: number | null;
  code: string;
  at: string;
  status: PrepStatus;
  lines: Array<{ name: string; quantity: number }>;
};

/** Lo stato di una comanda in un reparto è il più indietro tra le sue righe. */
export function ticketStatus(statuses: string[]): PrepStatus {
  const idx = Math.min(...statuses.map((s) => Math.max(0, PREP_STATUSES.indexOf(s as PrepStatus))));
  return PREP_STATUSES[Number.isFinite(idx) ? idx : 0];
}

async function editionBySlug(slug: string) {
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  return e;
}

/** I reparti dell'edizione: quelli scritti sui prodotti con il canale cassa. */
export async function listDepartments(editionId: string): Promise<string[]> {
  const rows = await getDb().selectDistinct({ d: products.department }).from(products).where(and(eq(products.editionId, editionId), isNotNull(products.department)));
  return rows
    .map((r) => r.d!.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'it'));
}

/** Comande di un reparto per lo schermo cucina, dalla più vecchia. */
export async function departmentQueue(ctx: Ctx, slug: string, department: string, now = new Date()): Promise<DepartmentTicket[]> {
  assertCanOn(ctx, 'pos.sell', slug);
  const edition = await editionBySlug(slug);
  requireModule(edition, 'departments');
  const rows = await getDb()
    .select({ orderId: ordersV2.id, code: ordersV2.code, at: ordersV2.createdAt, number: cashSales.number, name: products.name, quantity: orderLines.quantity, status: orderLines.prepStatus })
    .from(orderLines)
    .innerJoin(ordersV2, eq(ordersV2.id, orderLines.orderId))
    .innerJoin(cashSales, eq(cashSales.orderId, ordersV2.id))
    .innerJoin(products, eq(products.id, orderLines.productId))
    .where(
      and(
        eq(ordersV2.editionId, edition.id),
        inArray(ordersV2.status, ['paid', 'partially_refunded']),
        eq(orderLines.department, department),
        isNotNull(orderLines.prepStatus),
        gt(ordersV2.createdAt, new Date(now.getTime() - WINDOW_MS)),
      ),
    )
    .orderBy(asc(ordersV2.createdAt));
  const map = new Map<string, DepartmentTicket & { statuses: string[] }>();
  for (const r of rows) {
    const t = map.get(r.orderId) ?? { orderId: r.orderId, number: r.number, code: r.code, at: r.at.toISOString(), status: 'pending' as PrepStatus, lines: [], statuses: [] };
    t.lines.push({ name: r.name, quantity: r.quantity });
    t.statuses.push(r.status!);
    map.set(r.orderId, t);
  }
  return [...map.values()].map(({ statuses, ...t }) => ({ ...t, status: ticketStatus(statuses) }));
}

export const PrepStatusInput = z.object({ orderId: z.uuid(), department: z.string().trim().min(1).max(80), status: z.enum(PREP_STATUSES) });

/** Sposta la comanda di un reparto nella colonna indicata. */
export async function setPrepStatus(ctx: Ctx, input: z.input<typeof PrepStatusInput>): Promise<void> {
  const data = PrepStatusInput.parse(input);
  await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'pos.sell', edition.slug);
    if (ctx.device && ctx.device.edition !== edition.slug) throw new DomainError('FORBIDDEN');
    requireModule(edition, 'departments');
    const updated = await tx
      .update(orderLines)
      .set({ prepStatus: data.status, updatedAt: new Date() })
      .where(and(eq(orderLines.orderId, order.id), eq(orderLines.department, data.department), isNotNull(orderLines.prepStatus)))
      .returning({ id: orderLines.id });
    if (!updated.length) throw new DomainError('NOT_FOUND', { message: 'Questa comanda non è del reparto.' });
    await audit(tx, ctx, 'cash.prep_status', { entityType: 'order', entityId: order.id, edition: edition.slug, after: { department: data.department, status: data.status } });
  });
}

export type ReadyEntry = { number: number; department: string };

/**
 * Numeri pronti per lo schermo pubblico (§12.2): solo numeri e reparti, nessun dato personale.
 * Esiste solo con il modulo `departments` e l'impostazione "Schermo Pronti" accesa.
 */
export async function readyNumbers(slug: string, now = new Date()): Promise<{ title: string; ready: ReadyEntry[] } | null> {
  const [edition] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!edition || !edition.enabledModules.includes('departments')) return null;
  if (!(moduleSettings('departments', edition.moduleSettings) as { readyScreen?: boolean }).readyScreen) return null;
  const rows = await getDb()
    .select({ number: cashSales.number, department: orderLines.department })
    .from(orderLines)
    .innerJoin(ordersV2, eq(ordersV2.id, orderLines.orderId))
    .innerJoin(cashSales, eq(cashSales.orderId, ordersV2.id))
    .where(and(eq(ordersV2.editionId, edition.id), inArray(ordersV2.status, ['paid', 'partially_refunded']), eq(orderLines.prepStatus, 'ready'), isNotNull(cashSales.number), gt(orderLines.updatedAt, new Date(now.getTime() - READY_WINDOW_MS))))
    .orderBy(asc(orderLines.updatedAt));
  const seen = new Set<string>();
  const ready: ReadyEntry[] = [];
  for (const r of rows) {
    const key = `${r.number}|${r.department}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ready.push({ number: r.number!, department: r.department ?? '' });
  }
  return { title: edition.title, ready };
}
