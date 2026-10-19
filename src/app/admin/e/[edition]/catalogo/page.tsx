import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Catalogo' };

export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('catalog.edit', { edition: (await params).edition });
  if (denied) return denied;
  return <ComingSoon title="Catalogo" description="I biglietti e i prodotti di questa edizione, con prezzi e quote." when="con la fase 2" />;
}
