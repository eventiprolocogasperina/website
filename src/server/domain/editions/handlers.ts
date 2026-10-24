// Handler del ciclo di vita: dopo ogni ordine creato, scaduto, annullato o rimborsato ricalcola se
// l'edizione è esaurita (§9). Importato dai servizi che pubblicano questi eventi.
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { editions, products, sessions } from '@/server/db/schema';
import { on, registerOnce } from '@/server/domain/events';
import { log } from '@/server/log';
import { isSoldOut } from './sold-out';

export async function syncSoldOut(slug: string, now = new Date()): Promise<void> {
  const db = getDb();
  const [e] = await db.select({ id: editions.id, status: editions.status }).from(editions).where(eq(editions.slug, slug));
  if (!e || (e.status !== 'on_sale' && e.status !== 'sold_out')) return;
  // Import dinamico: catalog importa editions, che importa questo file.
  const { getAvailability } = await import('@/server/domain/catalog');
  const [productRows, sessionRows, availability] = await Promise.all([
    db.select().from(products).where(eq(products.editionId, e.id)),
    db.select().from(sessions).where(eq(sessions.editionId, e.id)),
    getAvailability(e.id),
  ]);
  const soldOut = isSoldOut(productRows, sessionRows, availability, now);
  if (soldOut === null || soldOut === (e.status === 'sold_out')) return;
  const { setSoldOutAutomatically } = await import('./index');
  if (await setSoldOutAutomatically(e.id, soldOut)) log.info(soldOut ? 'Edizione esaurita' : 'Edizione di nuovo in vendita', { edition: slug });
}

registerOnce('lifecycle', () => {
  for (const type of ['order.created', 'order.expired', 'order.cancelled', 'order.refunded', 'order.session_moved'] as const) {
    on(type, (event) => syncSoldOut(event.edition));
  }
});
