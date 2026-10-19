import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Ordini' };

export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('orders.read', { edition: (await params).edition });
  if (denied) return denied;
  return <ComingSoon title="Ordini" description="Gli ordini di questa sola edizione." when="con la fase 2" meanwhile={{ href: "/admin/ordini", label: "Vai a tutti gli ordini" }} />;
}
