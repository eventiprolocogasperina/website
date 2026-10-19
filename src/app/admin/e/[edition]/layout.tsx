import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getEdition } from '@/server/domain/editions';

/** Livello Edizione (§10.2): esiste solo per le edizioni conosciute. */
export default async function EditionLayout({ children, params }: { children: ReactNode; params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  if (!(await getEdition(edition))) notFound();
  return children;
}
