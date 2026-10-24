import { redirect } from 'next/navigation';
import LegacyPage from '@/components/admin/legacy/BookingsPage';
import { ordersV2Enabled } from '@/server/admin/flags';
import { pageDenied } from '@/server/auth/guard';

export const metadata = { title: 'Prenotazioni' };

/**
 * Vecchio indirizzo delle prenotazioni. Con il flag `orders_v2` acceso porta ai Partecipanti
 * dell'edizione scelta; spento mostra ancora la pagina di prima (che non ha più altre rotte,
 * perché /admin/e/[edition]/partecipanti è diventata la pagina nuova).
 */
export default async function Page() {
  if (await ordersV2Enabled()) redirect('/admin/vai/partecipanti');
  const denied = await pageDenied('orders.read');
  if (denied) return denied;
  return <LegacyPage />;
}
