import LegacyPage from '@/components/admin/legacy/AnalyticsPage';

export const metadata = { title: 'Statistiche' };

// Pagina precedente al rifacimento: mostra ancora i dati di tutte le edizioni insieme (filtro per edizione dal prompt 10).
export default function Page() {
  return <LegacyPage />;
}
