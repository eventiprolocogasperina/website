import { OrderDetailPage } from '@/components/admin/orders/detail/OrderDetailPage';
import { pageDenied } from '@/server/auth/guard';

type Props = { params: Promise<{ edition: string; code: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: `Ordine ${(await params).code.toUpperCase()}` };
}

export default async function Page({ params }: Props) {
  const { edition, code } = await params;
  const denied = await pageDenied('orders.read', { edition });
  if (denied) return denied;
  return <OrderDetailPage code={code} edition={edition} />;
}
