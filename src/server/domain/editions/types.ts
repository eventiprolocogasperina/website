// Tipi delle edizioni condivisi tra server, shell dell'admin e test (niente dipendenze dal database).

export const EDITION_STATUSES = ['draft', 'published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived', 'suspended'] as const;
export type EditionStatus = (typeof EDITION_STATUSES)[number];

/** Moduli che hanno già una pagina nell'admin (voci sotto "Moduli" nella sidebar dell'edizione). */
export const NAV_MODULES = ['invites', 'visitor-photos', 'reviews'] as const;
export type EditionModule = (typeof NAV_MODULES)[number];

/** Catalogo dei moduli (§7). Gli interruttori diventano attivi con il prompt 11. */
export const MODULE_CATALOG = [
  { key: 'time-slots', name: 'Fasce orarie', description: 'Scelta della data nel checkout e capienza per data.' },
  { key: 'attendee-questions', name: 'Domande ai partecipanti', description: 'Età dei bambini, intolleranze, attività scelte.' },
  { key: 'postponement', name: 'Rinvio date', description: 'Sposta ordini tra date, con email automatica e storico.' },
  { key: 'invites', name: 'Inviti e omaggi', description: 'Biglietti a 0 € inviati in blocco.' },
  { key: 'visitor-photos', name: 'Foto dei visitatori', description: 'Caricamento pubblico delle foto, moderazione e galleria.' },
  { key: 'route-stops', name: 'Percorso a tappe', description: 'Tappe con mappa, menu e QR stabile per tappa.' },
  { key: 'departments', name: 'Reparti e comande', description: 'Reparti della cassa, comande stampate, schermo cucina.' },
  { key: 'reviews', name: 'Recensioni', description: 'Raccolta e moderazione delle recensioni.' },
  { key: 'free-booking', name: 'Prenotazione gratuita', description: 'Iscrizione senza pagamento, con capienza.' },
  { key: 'landing-page', name: 'Pagina dedicata', description: 'Pagina a blocchi sotto l’indirizzo del format.' },
  { key: 'paylink', name: 'Pagamento con link', description: 'Ordini creati dall’admin e pagati con un link.' },
  { key: 'broadcast', name: 'Messaggi ai partecipanti', description: 'WhatsApp ed email a un gruppo di partecipanti.' },
] as const;
export type ModuleKey = (typeof MODULE_CATALOG)[number]['key'];

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
