import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Pagamenti' };

export default async function Page() {
  const denied = await pageDenied('settings.payments');
  if (denied) return denied;
  return <ComingSoon title="Pagamenti" description="Lo stato del collegamento con Nexi e le riconciliazioni." when="con la fase 2" />;
}
