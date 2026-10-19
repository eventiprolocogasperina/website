import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { editions, legacyIdMap, ordersV2 } from '@/server/db/schema';
import { newCheckoutEnabled } from './flags';

/**
 * Vecchi URL di successo (/zuccaland/success?order=…, /assaggia-e-passeggia/…/success?order=…): con il
 * checkout nuovo attivo, un ordine già migrato apre la sua conferma nuova (§13.2, nessun URL condiviso in 404).
 * Altrimenti null e la pagina di oggi resta com'è.
 */
export async function legacySuccessRedirect(legacyOrderId: string | undefined): Promise<string | null> {
  if (!legacyOrderId || !newCheckoutEnabled() || legacyOrderId.length > 100) return null;
  const [row] = await getDb()
    .select({ token: ordersV2.accessToken, edition: editions.slug })
    .from(legacyIdMap)
    .innerJoin(ordersV2, eq(ordersV2.id, legacyIdMap.newId))
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .where(and(eq(legacyIdMap.legacyId, legacyOrderId), inArray(legacyIdMap.legacyKind, ['order'])));
  return row ? `/acquista/${row.edition}/conferma/${row.token}` : null;
}
