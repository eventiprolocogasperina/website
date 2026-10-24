import { CustomersList } from '@/components/admin/customers/CustomersList';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { LoadError } from '@/components/admin/orders/LoadError';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { CUSTOMERS_PAGE_SIZE, listCustomers } from '@/server/domain/customers/admin';
import { log } from '@/server/log';

export const metadata = { title: 'Clienti' };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const denied = await pageDenied('customers.read');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(0, (Number.parseInt(sp.pagina ?? '1', 10) || 1) - 1);
  const data = await listCustomers(ctx, { q, page }).catch((error) => {
    log.error('Clienti non caricati', { error });
    return null;
  });
  if (!data) return <LoadError title="Clienti" what="i clienti" />;
  const { rows, total } = data;
  return (
    <AdminPage wide>
      <PageHeader title="Clienti" count={total} subtitle="Chi ha comprato o prenotato, con lo storico su tutte le edizioni." />
      <CustomersList rows={rows} total={total} page={page} pageSize={CUSTOMERS_PAGE_SIZE} q={q} />
    </AdminPage>
  );
}
