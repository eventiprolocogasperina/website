import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Check-in' };

export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('checkin.scan', { edition: (await params).edition });
  if (denied) return denied;
  return <ComingSoon title="Check-in" description="Gli ingressi registrati per questa edizione." when="con la fase 3" meanwhile={{ href: "/scanner", label: "Apri lo scanner" }} />;
}
