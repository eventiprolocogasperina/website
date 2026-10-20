import type { Metadata } from 'next';
import { FormatPage, formatPageMetadata } from '@/components/public/format/FormatPages';
import { publicV2Enabled } from '@/server/domain/pages';
import AssaggiaGrazieClient from './AssaggiaGrazieClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return (await publicV2Enabled()) ? formatPageMetadata('/assaggia-e-passeggia') : {};
}

/**
 * Con il flag `public_v2` acceso: pagina a blocchi del format (fuori stagione finché non c'è una
 * nuova edizione in vendita). Spento (default): la pagina "Grazie" di oggi, identica.
 */
export default async function AssaggiaPasseggiaPage() {
  if (await publicV2Enabled()) return <FormatPage path="/assaggia-e-passeggia" />;
  return <AssaggiaGrazieClient />;
}
