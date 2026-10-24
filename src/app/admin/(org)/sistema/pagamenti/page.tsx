import { AdminPage } from '@/components/admin/shell/AdminPage';
import { pageDenied } from '@/server/auth/guard';
import { nexiStatus } from '@/server/integrations/nexi';
import { PaymentsClient } from './PaymentsClient';

export const metadata = { title: 'Pagamenti' };

/**
 * Sistema → Pagamenti (§10.3): configurazione di Nexi. Alias e ambiente vengono dall'env; della
 * chiave MAC si vede solo se è impostata (§18.2). Solo il titolare (settings.payments).
 */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ prova?: string }> }) {
  const denied = await pageDenied('settings.payments');
  if (denied) return denied;
  const { prova } = await searchParams;
  const result = prova === 'ok' || prova === 'ko' || prova === 'annullato' || prova === 'firma' ? prova : null;
  return (
    <AdminPage>
      <PaymentsClient status={nexiStatus()} result={result} />
    </AdminPage>
  );
}
