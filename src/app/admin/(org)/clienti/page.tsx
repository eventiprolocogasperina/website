import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Clienti' };

export default async function Page() {
  const denied = await pageDenied('customers.read');
  if (denied) return denied;
  return <ComingSoon title="Clienti" description="Chi ha comprato o prenotato, con lo storico degli ordini e i consensi." when="con la fase 3" />;
}
