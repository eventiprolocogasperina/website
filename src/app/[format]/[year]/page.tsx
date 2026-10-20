import type { Metadata } from 'next';
import { EditionYearPage, editionYearMetadata } from '@/components/public/format/FormatPages';

type Props = { params: Promise<{ format: string; year: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { format, year } = await params;
  return editionYearMetadata(`/${format.toLowerCase()}`, year);
}

/** /<format>/<anno> per i format creati dall'admin (§13.2). */
export default async function GenericEditionYearPage({ params }: Props) {
  const { format, year } = await params;
  return <EditionYearPage path={`/${format.toLowerCase()}`} year={year} />;
}
