import LegacyPage from '@/components/admin/legacy/CashierAdminPage';

export const metadata = { title: 'Cassa' };

// Pagina precedente al rifacimento: mostra ancora i dati di tutte le edizioni insieme (filtro per edizione dal prompt 10).
export default function Page() {
  return <LegacyPage />;
}
