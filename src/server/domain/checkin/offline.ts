import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { checkinLists, checkins, editions, ordersV2, ticketsV2 } from '@/server/db/schema';
import { DomainError, isDomainError } from '@/server/domain/errors';
import { ADMITTING_STATUSES } from '@/server/domain/payments/status';
import { effectiveSession, offlineScanTime } from './rules';
import { assertCanOn, loadSessionGraph, scan, type ScanResult } from './scan';

/**
 * Impronta di un QR per l'elenco offline: sha256 del testo, primi 32 caratteri esadecimali.
 * Lo scanner calcola la stessa impronta con WebCrypto (src/components/scanner/offline.ts).
 */
export function qrHash(token: string): string {
  return createHash('sha256').update(token.trim(), 'utf8').digest('hex').slice(0, 32);
}

/**
 * Elenco per la modalità offline: solo impronte dei QR che possono entrare in questa lista, con la
 * data in cui valgono e se sono già entrati. Nessun nome, email, codice ordine o QR in chiaro.
 */
export type OfflineManifest = {
  listId: string;
  generatedAt: string;
  sessions: Array<{ id: string; label: string }>;
  /** [impronta, indice in `sessions` della data in cui vale (-1 = ogni giorno), 1 se già entrato in questa lista]. */
  entries: Array<[string, number, 0 | 1]>;
};

export async function offlineManifest(ctx: Ctx, listId: string, now = new Date()): Promise<OfflineManifest> {
  const db = getDb();
  const [row] = await db.select({ list: checkinLists, slug: editions.slug }).from(checkinLists).innerJoin(editions, eq(editions.id, checkinLists.editionId)).where(eq(checkinLists.id, listId));
  if (!row) throw new DomainError('NOT_FOUND');
  assertCanOn(ctx, 'checkin.scan', row.slug);
  const { list } = row;
  const graph = await loadSessionGraph(db, list.editionId);
  const tickets = await db
    .select({
      qr: ticketsV2.qrToken,
      sessionId: ticketsV2.sessionId,
      used: sql<boolean>`exists (select 1 from ${checkins} c where c.ticket_id = ${ticketsV2.id} and c.checkin_list_id = ${list.id} and c.reverted_at is null)`,
    })
    .from(ticketsV2)
    .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
    .where(
      and(
        eq(ticketsV2.editionId, list.editionId),
        eq(ticketsV2.status, 'valid'),
        inArray(ordersV2.status, ADMITTING_STATUSES),
        isNull(ordersV2.deletedAt),
        eq(ordersV2.isBlacklisted, false),
        list.productIds.length ? inArray(ticketsV2.productId, list.productIds) : undefined,
      ),
    );
  const sessionsOut = [...graph.values()].filter((s) => s.status !== 'postponed' || !s.rescheduledToSessionId).map((s) => ({ id: s.id, label: s.label }));
  const index = new Map(sessionsOut.map((s, i) => [s.id, i]));
  return {
    listId: list.id,
    generatedAt: now.toISOString(),
    sessions: sessionsOut,
    entries: tickets.map((t) => {
      const valid = effectiveSession(graph, t.sessionId);
      return [qrHash(t.qr), valid ? (index.get(valid) ?? -1) : -1, t.used ? 1 : 0];
    }),
  };
}

export const SyncInput = z.object({
  items: z
    .array(
      z.object({
        clientId: z.string().trim().min(8).max(80),
        qrToken: z.string().trim().min(4).max(200),
        checkinListId: z.string().uuid(),
        sessionId: z.string().uuid().nullish(),
        at: z.coerce.date().nullish(),
      }),
    )
    .max(500),
});

export type SyncOutcome = { clientId: string; result: ScanResult['result'] | 'error'; at?: string; by?: string | null; message?: string };

/**
 * Sincronizza i passaggi accodati offline. Idempotente sul `clientId`: rimandare lo stesso passaggio
 * (rete che cade a metà) non crea un secondo ingresso. Un biglietto fatto entrare nel frattempo da
 * un altro dispositivo torna come `already_used`, da mostrare al volontario.
 */
export async function syncOfflineCheckins(ctx: Ctx, input: z.input<typeof SyncInput>, now = new Date()): Promise<SyncOutcome[]> {
  const { items } = SyncInput.parse(input);
  const out: SyncOutcome[] = [];
  for (const item of items) {
    try {
      const r = await scan(ctx, { qrToken: item.qrToken, checkinListId: item.checkinListId, sessionId: item.sessionId }, { clientId: item.clientId, now: offlineScanTime(item.at, now) });
      out.push({ clientId: item.clientId, result: r.result, ...(r.result === 'valid' || r.result === 'already_used' ? { at: r.at.toISOString() } : {}), ...(r.result === 'already_used' ? { by: r.by } : {}) });
    } catch (error) {
      if (!isDomainError(error)) throw error;
      out.push({ clientId: item.clientId, result: 'error', message: error.message });
    }
  }
  return out;
}
