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

/**
 * Ambiti a cui si può assegnare un ruolo o abbinare un dispositivo: le edizioni più gli eventi
 * configurati nella cassa che non sono (ancora) edizioni. Provvisorio fino ai prompt 08 e 14.
 */
export async function listAssignableEditions(): Promise<Array<{ slug: string; title: string }>> {
  const editions = await listEditions();
  const out = editions.map((e) => ({ slug: e.slug, title: e.title }));
  try {
    const { getCashierConfig } = await import('@/lib/data/cashier');
    const known = new Set(editions.flatMap((e) => [e.slug, ...e.legacyIds]));
    for (const evt of (await getCashierConfig()).events) {
      if (!known.has(evt.id)) out.push({ slug: evt.id, title: `${evt.name} (cassa)` });
    }
  } catch {
    // Configurazione della cassa illeggibile: restano le sole edizioni.
  }
  return out;
}
