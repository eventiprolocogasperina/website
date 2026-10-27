/**
 * Dati letti dal server che i blocchi mostrano senza che l'admin li riscriva: prezzi dal catalogo,
 * sponsor, recensioni, foto della galleria, edizioni del format. Li prepara
 * `resolveBlockData` (src/server/domain/pages) per la pagina pubblica e per l'anteprima dell'editor.
 */
export type BlockData = {
  /** Anteprima dell'editor: i moduli (Avvisami) non inviano nulla. */
  preview?: boolean;
  edition: { slug: string; title: string; year: number | null; startsAt: string | null; endsAt: string | null; location: string | null; status: string } | null;
  series: { id: string; slug: string; name: string; landingPath: string | null } | null;
  /** Dove porta "Acquista": null se l'edizione non vende online in questo momento. */
  checkoutHref: string | null;
  prices: Array<{ id: string; name: string; description: string | null; priceCents: number; extra: boolean }>;
  sponsors: Array<{ name: string; logoUrl: string; websiteUrl: string | null }>;
  reviews: Record<string, Array<{ name: string | null; rating: number; comment: string | null }>>;
  gallery: Record<string, Array<{ src: string; alt: string; width: number; height: number }>>;
  /** Album webp usati dalle Gallerie della pagina, per nome. */
  albums: Record<string, Array<{ src: string; width: number; height: number }>>;
  /** Edizioni del format già passate o in corso, dalla più recente. */
  editions: Array<{ year: number | null; title: string; href: string; current: boolean }>;
};

/** Testo del consenso dell'iscrizione "Avvisami": si salva con l'iscrizione come prova. */
export const NOTIFY_CONSENT_TEXT = 'Acconsento a ricevere un’email quando apre la vendita della prossima edizione. Posso annullare l’iscrizione in ogni momento dal link nell’email.';

export const EMPTY_BLOCK_DATA: BlockData = {
  edition: null,
  series: null,
  checkoutHref: null,
  prices: [],
  sponsors: [],
  reviews: {},
  gallery: {},
  albums: {},
  editions: [],
};
