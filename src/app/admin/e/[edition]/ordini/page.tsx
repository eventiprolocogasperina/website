import { OrdersListPage } from '@/components/admin/orders/OrdersListPage';
import { pageDenied } from '@/server/auth/guard';

export const metadata = { title: 'Ordini' };

type Props = { params: Promise<{ edition: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ params, searchParams }: Props) {
  const { edition } = await params;
  const denied = await pageDenied('orders.read', { edition });
  if (denied) return denied;
  return <OrdersListPage edition={edition} searchParams={await searchParams} />;
}
