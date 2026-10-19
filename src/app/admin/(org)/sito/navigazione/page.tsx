import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Navigazione' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  return <ComingSoon title="Navigazione" description="Le voci del menu e del footer del sito." when="con la fase 4" />;
}
