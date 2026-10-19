import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import LegacyPage from '@/components/admin/legacy/AnalyticsPage';

export const metadata = { title: 'Statistiche' };

// Pagina precedente al rifacimento: mostra ancora i dati di tutte le edizioni insieme (filtro per edizione dal prompt 10).
export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('orders.read', { edition: (await params).edition });
  if (denied) return denied;
  return <LegacyPage />;
}
