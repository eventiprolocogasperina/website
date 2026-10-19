// Tipi delle edizioni usati dalla shell dell'admin. Il prompt 08 introduce le tabelle vere
// (formats, editions…); fino ad allora le edizioni sono ricostruite da legacyEditions.ts.

export type EditionStatus = 'draft' | 'published' | 'on_sale' | 'sold_out' | 'live' | 'concluded' | 'archived' | 'suspended';

/** Moduli attivabili per edizione (§10.3, voci sotto "Moduli"). */
export type EditionModule = 'invites' | 'visitor-photos' | 'reviews';

export type EditionSummary = {
  /** Slug usato negli URL dell'admin: /admin/e/[slug]. */
  slug: string;
  title: string;
  /** Format di appartenenza (zuccaland, assaggia-e-passeggia…) o null per eventi singoli. */
  format: string | null;
  status: EditionStatus;
  /** Primo giorno, "YYYY-MM-DD". */
  startsOn: string | null;
  /** Colore del pallino nel selettore (unico uso dei temi dei format nell'admin, §14.3). */
  dot: 'orange' | 'blue' | 'gold' | 'gray';
  modules: EditionModule[];
  /** ID con cui l'edizione compare nelle tabelle attuali (events.id, tickets.eventId…). */
  legacyIds: string[];
  /** true se la pagina pubblica ha un editor dedicato nell'admin attuale. */
  hasPageEditor: boolean;
};

/** Stati "attivi": compaiono in cima al selettore. */
export const ACTIVE_STATUSES: EditionStatus[] = ['published', 'on_sale', 'sold_out', 'live'];
