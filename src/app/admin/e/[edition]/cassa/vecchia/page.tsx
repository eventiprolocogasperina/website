import { pageDenied } from '@/server/auth/guard';
import type { EditionParams } from '@/server/domain/editions/page-params';
import LegacyPage from '@/components/admin/legacy/CashierAdminPage';

export const metadata = { title: 'Vecchia cassa' };

// Vecchia pagina della cassa (precedente al rifacimento), spostata qui dal prompt 14: resta finché
// la vecchia /cashier è in uso (§18.10). La nuova gestione è in /admin/e/[edition]/cassa.
export default async function Page({ params }: EditionParams) {
  const denied = await pageDenied('catalog.edit', { edition: (await params).edition });
  if (denied) return denied;
  return <LegacyPage />;
}
