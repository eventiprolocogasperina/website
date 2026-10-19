import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Format' };

export default async function Page() {
  const denied = await pageDenied('editions.create');
  if (denied) return denied;
  return <ComingSoon title="Format" description="Ogni format (Zuccaland, Assaggia e Passeggia…) con le sue edizioni, i moduli e la pagina fuori stagione." when="con la fase 2" />;
}
