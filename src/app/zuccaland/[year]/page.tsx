import type { Metadata } from 'next';
import { EditionYearPage, editionYearMetadata } from '@/components/public/format/FormatPages';

type Props = { params: Promise<{ year: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return editionYearMetadata('/zuccaland', (await params).year);
}

/** /zuccaland/2026: pagina a blocchi dell'edizione (§13.2), attiva o archiviata. */
export default async function ZuccalandYearPage({ params }: Props) {
  return <EditionYearPage path="/zuccaland" year={(await params).year} />;
}
