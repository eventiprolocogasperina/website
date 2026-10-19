import 'server-only';
import { notFound } from 'next/navigation';
import { getEdition } from './index';
import type { EditionSummary } from './types';

export type EditionParams = { params: Promise<{ edition: string }> };

/** Legge l'edizione dai parametri di una pagina /admin/e/[edition]/…, oppure 404. */
export async function editionFromParams({ params }: EditionParams): Promise<EditionSummary> {
  const edition = await getEdition((await params).edition);
  if (!edition) notFound();
  return edition;
}
