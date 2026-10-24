import type { Metadata } from 'next';
import { FormatPage, formatPageMetadata } from '@/components/public/format/FormatPages';
import { getPageContent, DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';
import { getZuccalandDateCounts } from '@/lib/data/tickets';
import { publicV2Enabled } from '@/server/domain/pages';
import { newCheckoutEnabled } from '@/server/public/flags';
import ZuccalandClient from './ZuccalandClient';

export async function generateMetadata(): Promise<Metadata> {
  if (await publicV2Enabled()) return formatPageMetadata('/zuccaland');
  return {
    title: 'Zuccaland - Pro Loco Gasperina',
    description: 'Il villaggio magico delle zucche di Gasperina. Un\'esperienza incantata tra colori autunnali.',
  };
}

export const revalidate = 0; // Ensures the page fetches fresh data from CMS

/**
 * Con il flag `public_v2` acceso: pagina a blocchi (edizione in corso o fuori stagione, §13.2).
 * Spento (default, §18.10): la pagina di oggi, identica, con il suo acquisto.
 */
export default async function ZuccalandPage() {
  if (await publicV2Enabled()) return <FormatPage path="/zuccaland" />;
  const [data, dateCounts] = await Promise.all([
    getPageContent<ZuccalandContent>('zuccaland', DEFAULT_ZUCCALAND_CONTENT),
    getZuccalandDateCounts()
  ]);
  return <ZuccalandClient content={data} initialDateCounts={dateCounts} checkoutEdition={newCheckoutEnabled() ? 'zuccaland-2026' : undefined} />;
}
