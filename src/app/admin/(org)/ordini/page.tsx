import LegacyPage from '@/components/admin/legacy/OrdersPage';

export const metadata = { title: 'Ordini' };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const initialSearch = (Array.isArray(q) ? q[0] : q)?.slice(0, 100) ?? '';
  // key: una nuova ricerca dalla palette ⌘K riparte da capo anche se si è già sulla pagina.
  return <LegacyPage key={initialSearch} initialSearch={initialSearch} />;
}
