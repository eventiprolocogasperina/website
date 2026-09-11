import type { Metadata } from 'next';
import { getPageContent, DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';
import ZuccalandClient from './ZuccalandClient';

export const metadata: Metadata = {
  title: 'Zuccaland - Pro Loco Gasperina',
  description: 'Il villaggio magico delle zucche di Gasperina. Un\'esperienza incantata tra colori autunnali.',
};

export const revalidate = 0; // Ensures the page fetches fresh data from CMS

export default async function ZuccalandPage() {
  const data = await getPageContent<ZuccalandContent>('zuccaland', DEFAULT_ZUCCALAND_CONTENT);
  return <ZuccalandClient content={data} />;
}
