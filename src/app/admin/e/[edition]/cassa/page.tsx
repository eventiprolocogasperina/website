import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import LegacyPage from '@/components/admin/legacy/CashierAdminPage';

export const metadata = { title: 'Cassa' };

// Pagina precedente al rifacimento: mostra ancora i dati di tutte le edizioni insieme (filtro per edizione dal prompt 10).
export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('catalog.edit', { edition: (await params).edition });
  if (denied) return denied;
  return <LegacyPage />;
}
