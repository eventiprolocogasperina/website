import { RefundsPage } from '@/components/admin/refunds/RefundsPage';
import LegacyPage from '@/components/admin/legacy/RefundsPage';
import { ordersV2Enabled } from '@/server/admin/flags';
import { pageDenied } from '@/server/auth/guard';

export const metadata = { title: 'Rimborsi' };

/** Con il flag `orders_v2` acceso è la coda nuova di tutte le edizioni; spento resta la pagina di oggi. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const denied = await pageDenied('orders.read');
  if (denied) return denied;
  if (await ordersV2Enabled()) return <RefundsPage edition={null} searchParams={await searchParams} />;
  return <LegacyPage />;
}
