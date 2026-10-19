import { OrdersListPage } from '@/components/admin/orders/OrdersListPage';
import LegacyPage from '@/components/admin/legacy/OrdersPage';
import { ordersV2Enabled } from '@/server/admin/flags';
import { pageDenied } from '@/server/auth/guard';

export const metadata = { title: 'Ordini' };

type Search = Record<string, string | string[] | undefined>;

/** Con il flag `orders_v2` acceso è l'elenco nuovo di tutte le edizioni; spento resta la pagina di oggi. */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const denied = await pageDenied('orders.read');
  if (denied) return denied;
  const sp = await searchParams;
  if (await ordersV2Enabled()) return <OrdersListPage edition={null} searchParams={sp} />;
  const q = sp.q;
  const initialSearch = (Array.isArray(q) ? q[0] : q)?.slice(0, 100) ?? '';
  // key: una nuova ricerca dalla palette ⌘K riparte da capo anche se si è già sulla pagina.
  return <LegacyPage key={initialSearch} initialSearch={initialSearch} />;
}
