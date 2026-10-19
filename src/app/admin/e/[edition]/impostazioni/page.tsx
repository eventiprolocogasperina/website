import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Impostazioni' };

export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('editions.edit', { edition: (await params).edition });
  if (denied) return denied;
  return <ComingSoon title="Impostazioni" description="Nome, date, stato e moduli attivi di questa edizione." when="con la fase 2" meanwhile={{ href: "/admin/edizioni", label: "Vai alle edizioni" }} />;
}
