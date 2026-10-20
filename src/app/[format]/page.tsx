import type { Metadata } from 'next';
import { FormatPage, formatPageMetadata } from '@/components/public/format/FormatPages';

type Props = { params: Promise<{ format: string }> };

export const dynamic = 'force-dynamic';

const path = (format: string) => `/${format.toLowerCase()}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return formatPageMetadata(path((await params).format));
}

/**
 * Pagina di un format nuovo creato dall'admin con la sua pagina pubblica (es. /baguette-da-record):
 * nessun file da aggiungere. Zuccaland e A&P hanno le loro cartelle; un percorso che non è la pagina
 * di un format risponde 404 come prima.
 */
export default async function GenericFormatPage({ params }: Props) {
  return <FormatPage path={path((await params).format)} />;
}
