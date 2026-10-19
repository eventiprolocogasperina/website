import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Date e capienze' };

export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('catalog.edit', { edition: (await params).edition });
  if (denied) return denied;
  return <ComingSoon title="Date e capienze" description="Le date, gli orari e i posti disponibili di questa edizione." when="con la fase 2" />;
}
