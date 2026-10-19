import 'server-only';
import { cache } from 'react';
import { romeDateKey } from '@/lib/dates';
import { listLegacyEditions } from './legacyEditions';
import { ACTIVE_STATUSES, type EditionSummary } from './types';

export type { EditionModule, EditionStatus, EditionSummary } from './types';

/** Cookie con l'ultima edizione scelta nel selettore (lo imposta src/proxy.ts). */
export const EDITION_COOKIE = 'pl_edition';

/** Tutte le edizioni, una volta per richiesta. */
export const listEditions = cache(async (): Promise<EditionSummary[]> => listLegacyEditions(romeDateKey(new Date())));

export async function getEdition(slug: string): Promise<EditionSummary | null> {
  return (await listEditions()).find((e) => e.slug === slug) ?? null;
}

/** Edizione predefinita: quella nel cookie se esiste ancora, altrimenti la prima attiva, altrimenti la più recente. */
export function pickDefaultEdition(editions: EditionSummary[], cookieSlug?: string | null): EditionSummary | null {
  return (
    editions.find((e) => e.slug === cookieSlug) ??
    editions.find((e) => ACTIVE_STATUSES.includes(e.status)) ??
    editions[0] ??
    null
  );
}
