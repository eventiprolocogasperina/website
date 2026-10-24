import 'server-only';
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { customers, editions, ordersV2, refundsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { likeEscape, readableEditions } from '@/server/domain/orders/admin-list';
import { maskedIbanOf } from '@/server/domain/orders/admin-detail';
import { decryptIban } from './crypto';

export const REFUND_STATUSES = ['requested', 'approved', 'paid', 'rejected'] as const;
export type RefundStatusKey = (typeof REFUND_STATUSES)[number];
export const REFUNDS_PAGE_SIZE = 50;

/**
 * Canale dell'ordine rimborsato. La logica cambia: un ordine online (o con link di pagamento) si
 * rimborsa con bonifico o storno Nexi; uno di cassa in contanti alla cassa; uno dall'admin come è stato pagato.
 */
export const REFUND_CHANNELS = { online: ['online', 'paylink'], cassa: ['pos'], admin: ['admin', 'invite'] } as const;
export type RefundChannelKey = keyof typeof REFUND_CHANNELS;

export type RefundFilters = { status: RefundStatusKey | ''; channel: RefundChannelKey | ''; q: string; page: number };

export type RefundRow = {
  id: string;
  orderId: string;
  orderCode: string;
  editionSlug: string;
  editionTitle: string;
  channel: string;
  customerName: string | null;
  customerEmail: string | null;
  amountCents: number;
  method: string;
  status: string;
  reason: string | null;
  holderName: string | null;
  iban: string | null;
  requestedAt: string;
  processedAt: string | null;
};

function conditions(scope: 'all' | string[], f: Pick<RefundFilters, 'status' | 'q'> & { channel?: RefundFilters['channel'] }) {
  const q = f.q ? `%${likeEscape(f.q)}%` : null;
  return and(
    isNull(ordersV2.deletedAt),
    scope === 'all' ? undefined : inArray(editions.slug, scope),
    f.status ? eq(refundsV2.status, f.status) : undefined,
    f.channel ? inArray(ordersV2.channel, [...REFUND_CHANNELS[f.channel]]) : undefined,
    q ? or(ilike(ordersV2.code, q), ilike(customers.name, q), ilike(customers.email, q), ilike(refundsV2.holderName, q)) : undefined,
  );
}

const query = () =>
  getDb()
    .select({
      id: refundsV2.id,
      orderId: refundsV2.orderId,
      orderCode: ordersV2.code,
      editionSlug: editions.slug,
      editionTitle: editions.title,
      channel: ordersV2.channel,
      customerName: customers.name,
      customerEmail: customers.email,
      amountCents: refundsV2.amountCents,
      method: refundsV2.method,
      status: refundsV2.status,
      reason: refundsV2.reason,
      holderName: refundsV2.holderName,
      ibanEncrypted: refundsV2.ibanEncrypted,
      requestedAt: refundsV2.requestedAt,
      processedAt: refundsV2.processedAt,
    })
    .from(refundsV2)
    .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .leftJoin(customers, eq(customers.id, ordersV2.customerId));

type Raw = Awaited<ReturnType<typeof query>>[number];
const toRow = ({ ibanEncrypted, ...r }: Raw): RefundRow => ({
  ...r,
  iban: maskedIbanOf(ibanEncrypted),
  requestedAt: r.requestedAt.toISOString(),
  processedAt: r.processedAt?.toISOString() ?? null,
});

/** Coda dei rimborsi (prompt 12): prima le richieste da gestire, poi le altre dalla più recente. IBAN sempre mascherato. */
export async function listRefunds(ctx: Ctx, edition: string | null, f: RefundFilters): Promise<{ rows: RefundRow[]; total: number; counts: Record<RefundStatusKey, number> }> {
  const scope = readableEditions(ctx, edition);
  const where = conditions(scope, f);
  const db = getDb();
  const [rows, [{ n }], counts] = await Promise.all([
    query()
      .where(where)
      .orderBy(sql`case ${refundsV2.status} when 'requested' then 0 when 'approved' then 1 else 2 end`, desc(refundsV2.requestedAt))
      .limit(REFUNDS_PAGE_SIZE)
      .offset(f.page * REFUNDS_PAGE_SIZE),
    db
      .select({ n: count() })
      .from(refundsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
      .innerJoin(editions, eq(editions.id, ordersV2.editionId))
      .leftJoin(customers, eq(customers.id, ordersV2.customerId))
      .where(where),
    db
      .select({ status: refundsV2.status, n: count() })
      .from(refundsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
      .innerJoin(editions, eq(editions.id, ordersV2.editionId))
      .where(conditions(scope, { status: '', q: '', channel: f.channel }))
      .groupBy(refundsV2.status),
  ]);
  const byStatus = Object.fromEntries(REFUND_STATUSES.map((s) => [s, counts.find((c) => c.status === s)?.n ?? 0])) as Record<RefundStatusKey, number>;
  return { rows: rows.map(toRow), total: n, counts: byStatus };
}

export type RefundExportRow = RefundRow & { ibanFull: string | null };

/**
 * Rimborsi approvati da pagare con bonifico, per il CSV della banca. L'IBAN intero c'è solo con
 * `refunds.view_iban` su tutte le edizioni esportate, e l'esportazione resta nel registro.
 */
export async function exportApprovedRefunds(ctx: Ctx, edition: string | null): Promise<{ rows: RefundExportRow[]; fullIban: boolean }> {
  const scope = readableEditions(ctx, edition);
  const rows = await query()
    .where(and(conditions(scope, { status: 'approved', q: '' }), eq(refundsV2.method, 'bank_transfer')))
    .orderBy(refundsV2.requestedAt);
  const fullIban = rows.every((r) => can(ctx, 'refunds.view_iban', { edition: r.editionSlug }));
  if (fullIban && rows.length) {
    await withTransaction((tx) =>
      audit(tx, ctx, 'refund.iban_exported', { entityType: 'refund', edition, after: { refunds: rows.length, ids: rows.map((r) => r.id) } }),
    );
  }
  return {
    fullIban,
    rows: rows.map((r) => ({ ...toRow(r), ibanFull: fullIban && r.ibanEncrypted ? safeDecrypt(r.ibanEncrypted) : null })),
  };
}

function safeDecrypt(v: string): string | null {
  try {
    return decryptIban(v);
  } catch {
    return null;
  }
}
