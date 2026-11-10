import 'server-only';
import { and, count, eq, inArray } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { withTransaction, type Tx } from '@/server/db/client';
import {
  cashCounters,
  cashRegisters,
  cashSales,
  cashSessions,
  checkinLists,
  checkins,
  costs,
  editions,
  inventoryMovements,
  legacyIdMap,
  notifySignups,
  ordersV2,
  series,
  whatsappBroadcasts,
} from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { assertCan } from './index';

/*
 * Eliminazione di edizioni e format dalle Impostazioni. Si elimina solo ciò che non ha storia:
 * un'edizione con ordini, incassi, ingressi, costi o messaggi resta (§18.5: ordini, pagamenti e
 * registro non si cancellano mai) e si nasconde cambiando stato. Un'edizione archiviata senza
 * storia (es. un evento passato portato dal backfill) si può eliminare: decisione del 10/11/2026,
 * eccezione al §18.7. Date, prodotti, quote e impostazioni se ne vanno con l'edizione (cascade).
 */

const n = async (q: Promise<Array<{ n: number }>>) => (await q)[0]?.n ?? 0;

/** Cosa impedisce l'eliminazione, in parole per l'admin. Vuoto: si può eliminare. */
export async function editionDeleteBlockers(tx: Tx, editionId: string): Promise<string[]> {
  const lists = tx.select({ id: checkinLists.id }).from(checkinLists).where(eq(checkinLists.editionId, editionId));
  const [orders, sessions, sales, entries, costRows, stock, broadcasts] = await Promise.all([
    n(tx.select({ n: count() }).from(ordersV2).where(eq(ordersV2.editionId, editionId))),
    n(tx.select({ n: count() }).from(cashSessions).where(eq(cashSessions.editionId, editionId))),
    n(tx.select({ n: count() }).from(cashSales).where(eq(cashSales.editionId, editionId))),
    n(tx.select({ n: count() }).from(checkins).where(inArray(checkins.checkinListId, lists))),
    n(tx.select({ n: count() }).from(costs).where(eq(costs.editionId, editionId))),
    n(tx.select({ n: count() }).from(inventoryMovements).where(eq(inventoryMovements.editionId, editionId))),
    n(tx.select({ n: count() }).from(whatsappBroadcasts).where(eq(whatsappBroadcasts.editionId, editionId))),
  ]);
  return [
    orders && `${orders} ordini`,
    (sessions || sales) && 'turni o vendite di cassa',
    entries && `${entries} ingressi registrati`,
    costRows && `${costRows} costi`,
    stock && 'movimenti di magazzino',
    broadcasts && 'messaggi WhatsApp inviati',
  ].filter((x): x is string => !!x);
}

/** Per la pagina Impostazioni: i motivi che bloccano l'eliminazione, senza scrivere niente. */
export const editionDeleteBlockersFor = (editionId: string) => withTransaction((tx) => editionDeleteBlockers(tx, editionId));

export async function deleteEdition(ctx: Ctx, slug: string): Promise<void> {
  assertCan(ctx, 'editions.archive', slug);
  await withTransaction(async (tx) => {
    const [row] = await tx.select().from(editions).where(eq(editions.slug, slug)).for('update');
    if (!row) throw new DomainError('NOT_FOUND');
    const blockers = await editionDeleteBlockers(tx, row.id);
    if (blockers.length) {
      throw new DomainError('CONFLICT', { message: `Non si può eliminare: l’edizione ha ${blockers.join(', ')}. Per toglierla dal sito cambia lo stato (es. Torna in bozza).` });
    }
    // Configurazione senza storia che non va via da sola (FK senza cascade).
    await tx.delete(checkinLists).where(eq(checkinLists.editionId, row.id));
    await tx.delete(cashCounters).where(eq(cashCounters.editionId, row.id));
    await tx.delete(cashRegisters).where(eq(cashRegisters.editionId, row.id));
    await tx.delete(legacyIdMap).where(and(eq(legacyIdMap.newId, row.id), inArray(legacyIdMap.legacyKind, ['event', 'legacy_event_id', 'cashier_event'])));
    await tx.delete(editions).where(eq(editions.id, row.id));
    await audit(tx, ctx, 'edition.deleted', {
      entityType: 'edition',
      entityId: row.id,
      edition: slug,
      before: { title: row.title, slug: row.slug, status: row.status, startsAt: row.startsAt, seriesId: row.seriesId },
    });
  });
}

export async function deleteSeries(ctx: Ctx, id: string): Promise<void> {
  assertCan(ctx, 'editions.archive');
  await withTransaction(async (tx) => {
    const [row] = await tx.select().from(series).where(eq(series.id, id)).for('update');
    if (!row) throw new DomainError('NOT_FOUND');
    const used = await n(tx.select({ n: count() }).from(editions).where(eq(editions.seriesId, id)));
    if (used) throw new DomainError('CONFLICT', { message: `Non si può eliminare: il format ha ${used} edizioni. Elimina o sposta prima le edizioni.` });
    const signups = await n(tx.select({ n: count() }).from(notifySignups).where(eq(notifySignups.seriesId, id)));
    if (signups) throw new DomainError('CONFLICT', { message: `Non si può eliminare: ${signups} persone sono iscritte ad “Avvisami” per questo format.` });
    await tx.delete(series).where(eq(series.id, id));
    await audit(tx, ctx, 'series.deleted', { entityType: 'series', entityId: id, before: { name: row.name, slug: row.slug, landingPath: row.landingPath } });
  });
}
