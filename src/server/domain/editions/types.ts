// Tipi delle edizioni condivisi tra server, shell dell'admin e test (niente dipendenze dal database).
import { MODULES } from '@/modules/registry';
import type { ModuleKey } from '@/modules/types';

export const EDITION_STATUSES = ['draft', 'published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived', 'suspended'] as const;
export type EditionStatus = (typeof EDITION_STATUSES)[number];

/** Moduli con una pagina nell'admin (voci sotto "Moduli" nella sidebar dell'edizione). */
export const NAV_MODULES = MODULES.filter((m) => m.admin?.nav).map((m) => m.key);
export type EditionModule = ModuleKey;

/** Catalogo dei moduli (§7), dal registro. */

export type { ModuleKey };

export type EditionDot = 'orange' | 'blue' | 'gold' | 'gray';

export type EditionSummary = {
  id: string;
  /** Slug usato negli URL dell'admin: /admin/e/[slug]. Non cambia dopo la creazione. */
  slug: string;
  title: string;
  /** Slug del format (zuccaland, assaggia-e-passeggia…) o null per gli eventi singoli. */
  format: string | null;
  formatName: string | null;
  status: EditionStatus;
  /** Primo giorno a Roma, "YYYY-MM-DD". */
  startsOn: string | null;
  /** Ultimo giorno a Roma, se indicato: un'edizione in corso resta tra le prossime fino a quel giorno. */
  endsOn: string | null;
  /** Colore del pallino nel selettore (unico uso dei temi dei format nell'admin, §14.3). */
  dot: EditionDot;
  /** Moduli attivi che hanno una pagina nell'admin. */
  modules: EditionModule[];
  /** ID con cui l'edizione compare nelle tabelle attuali (events.id, tickets.eventId, cassa…). */
  legacyIds: string[];
  /** true se l'edizione viene dal vecchio sistema (backfill): le sue vendite passano ancora da lì. */
  imported: boolean;
  /** true se la pagina pubblica ha un editor nell'admin attuale (Zuccaland, A&P). */
  hasPageEditor: boolean;
};

/** Stati "attivi": compaiono in cima al selettore. */
export const ACTIVE_STATUSES: EditionStatus[] = ['published', 'on_sale', 'sold_out', 'live'];

export const EDITION_STATUS_LABELS: Record<EditionStatus, string> = {
  draft: 'Bozza',
  published: 'Pubblicata',
  on_sale: 'In vendita',
  sold_out: 'Esaurita',
  live: 'In corso',
  concluded: 'Conclusa',
  archived: 'Archiviata',
  suspended: 'Sospesa',
};
