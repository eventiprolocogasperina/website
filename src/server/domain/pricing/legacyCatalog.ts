import 'server-only';
import { getPageContent, DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';
import type { Catalog, CatalogProduct } from './priceCart';

/**
 * Listino ufficiale degli eventi che oggi vendono biglietti online tramite /api/orders.
 * Ponte verso il catalogo vero (prompt 08): legge i prezzi dalle stesse fonti che usa il sito.
 *
 * Fonti:
 * - `zuccaland-2026`: `ticketTypes` del contenuto `pages_content['zuccaland']`, modificabile in
 *   /admin/pagine/zuccaland. Se il contenuto salvato non ha `ticketTypes`, si usano quelli di
 *   DEFAULT_ZUCCALAND_CONTENT, esattamente come fa la pagina pubblica.
 *
 * Nessun altro eventId crea ordini online oggi (Assaggia e Passeggia 2026 è conclusa e la sua
 * pagina non chiama /api/orders): un eventId sconosciuto produce UNKNOWN_PRODUCT.
 */
export async function getLegacyCatalog(eventId: string): Promise<Catalog | null> {
  if (eventId === 'zuccaland-2026') {
    const content = await getPageContent<ZuccalandContent>('zuccaland', DEFAULT_ZUCCALAND_CONTENT);
    const ticketTypes = content.ticketTypes || DEFAULT_ZUCCALAND_CONTENT.ticketTypes;
    const products: CatalogProduct[] = ticketTypes.map((t) => ({
      id: t.id,
      label: t.label,
      unitPriceCents: Math.round(Number(t.price) * 100),
    }));
    // Codici validi per Zuccaland: globali o solo Zuccaland (FULL_TICKET è "Solo Biglietto Intero
    // Assaggia 2026", che la pagina Zuccaland già rifiuta).
    return { eventId, products, acceptedDiscountScopes: ['ALL', 'ZUCCALAND_ONLY'] };
  }
  return null;
}
