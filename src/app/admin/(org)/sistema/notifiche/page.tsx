import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Notifiche' };

export default async function Page() {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  return <ComingSoon title="Notifiche" description="Quali avvisi arrivano su Telegram e a chi." when="con la fase 4" />;
}
