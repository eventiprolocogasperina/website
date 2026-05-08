// ─── Event Data ───────────────────────────────────────────────
export interface Event {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: 'cultura' | 'musica' | 'gastronomia' | 'sport' | 'comunità';
  description: string;
  fullDescription: string;
  image: string;
  maxParticipants: number;
  registeredCount: number;
  price: number;
  featured: boolean;
}

export const events: Event[] = [
  // ── Passati ──────────────────────────────────────────────────
  {
    id: '1',
    slug: 'festivalbeer-prima-edizione-2024',
    title: 'Festival Beer – 1ª Edizione',
    date: '2024-10-12',
    time: '19:00',
    location: 'Piazzale della Pace, Gasperina',
    category: 'musica',
    description: 'La prima edizione della Festa della Birra a Gasperina: musica dal vivo con Mimmo Cavallaro, Tatho e stand gastronomici con le specialità locali.',
    fullDescription: `Torna la Festa della Birra a Gasperina! Appuntamento imperdibile il 12 ottobre a partire dalle ore 19:00.

La serata è caratterizzata da un ricco programma musicale, con il concerto di Mimmo Cavallaro e l'esibizione di Tatho. Gli stand gastronomici propongono le specialità locali, tra cui il rinomato panino con la salsiccia.`,
    image: '/img/Event_1.jpeg',
    maxParticipants: 500,
    registeredCount: 500,
    price: 0,
    featured: false,
  },
  {
    id: '2',
    slug: 'assaggia-passeggia-creuza-de-ma-2025',
    title: 'Assaggia & Passeggia 3 – Creuza de mä',
    date: '2025-08-11',
    time: '19:00',
    location: 'Via Trento e Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'Terza edizione del percorso enogastronomico tra le vie di Gasperina, dedicata a Fabrizio De André. Menù a base di pesce e concerto finale dei Faber Quartet.',
    fullDescription: `Nel cuore dell'estate calabrese torna uno degli appuntamenti più attesi: il borgo di Gasperina ospita la terza edizione di "Assaggia & Passeggia", quest'anno dedicata a Fabrizio De André con un'edizione speciale dal titolo evocativo: "Creuza de mä".

Proprio come le strette vie liguri che conducono al mare, anche le strade di Gasperina diventano un percorso sensoriale tra sapori, suggestioni e musica. A partire da via Trento, il borgo si trasforma in una "creuza" calabrese: un itinerario enogastronomico e culturale che attraversa il centro storico, arricchito per l'occasione da installazioni a tema marino, decorazioni artigianali e angoli che raccontano il Mediterraneo attraverso gli occhi e le parole di De André.

Durante la passeggiata sarà possibile degustare un menu a base di pesce, realizzato con prodotti locali e ispirato alla cucina tradizionale reinterpretata in chiave creativa. Un viaggio nel gusto che si fonde con l'identità del territorio e l'immaginario poetico del cantautore genovese.

A chiudere la serata, alle ore 22:00 in piazza E. Fermi, il concerto dei Faber Quartet: un omaggio emozionante ai capolavori di De André, tra note, parole e memoria condivisa.`,
    image: '/img/IMG1.jpg',
    maxParticipants: 300,
    registeredCount: 300,
    price: 0,
    featured: false,
  },
  {
    id: '3',
    slug: 'festivalbeer-seconda-edizione-2025',
    title: 'Festival Beer – 2ª Edizione',
    date: '2025-10-11',
    time: '19:00',
    location: 'Piazzale della Pace, Gasperina',
    category: 'musica',
    description: 'Seconda edizione del Festival Beer con i Takabum Street Band e Cecè Berretta. Birra artigianale Birra Gladium e stand gastronomici.',
    fullDescription: `Il Piazzale della Pace di Gasperina diventa il palcoscenico della seconda edizione del Festival Beer, l'appuntamento che unisce buona musica, birra e sapori calabresi.

Dopo il successo della prima edizione, il festival torna con un programma ricco di energia e gusto. La serata sarà aperta dai Takabum Street Band, con il loro mix di funk, sonorità mediterranee, swing, ska e world music, tra brani originali e rivisitazioni dei grandi classici jazz e della canzone italiana. A seguire, il concerto di Cecè Berretta, artista calabrese amatissimo dal pubblico e protagonista di un tour che ha riempito piazze in tutta Italia.

Il pubblico potrà degustare birra artigianale calabrese Birra Gladium e birre tedesche accompagnate da stand gastronomici con le migliori prelibatezze del territorio, per una serata di festa che celebra allegria, tradizione birraia e convivialità.`,
    image: '/img/IMG_3.jpg',
    maxParticipants: 500,
    registeredCount: 500,
    price: 0,
    featured: false,
  },

  // ── Prossimi 2026 ─────────────────────────────────────────────
  {
    id: '4',
    slug: 'assaggia-passeggia-the-experience-2026',
    title: 'Assaggia & Passeggia – The Experience',
    date: '2026-07-18',
    time: '19:00',
    location: 'Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'Una nuova dimensione di "Assaggia & Passeggia": un\'esperienza immersiva tra gusto, arte e cultura nel cuore del borgo.',
    fullDescription: `Una nuova dimensione di "Assaggia & Passeggia": un'esperienza immersiva tra gusto, arte e cultura nel cuore del borgo di Gasperina.

Maggiori dettagli in arrivo. Segui i nostri canali social per restare aggiornato!`,
    image: '/img/IMG_2.jpg',
    maxParticipants: 300,
    registeredCount: 0,
    price: 0,
    featured: true,
  },
  {
    id: '5',
    slug: 'la-baguette-da-record-2026',
    title: 'La Baguette da Record',
    date: '2026-08-07',
    time: '18:00',
    location: 'Gasperina',
    category: 'comunità',
    description: 'Un evento unico: la Pro Loco Gasperina si cimenta in un\'impresa straordinaria con la baguette più lunga della Calabria.',
    fullDescription: `Un evento unico nel suo genere: la Pro Loco Gasperina si cimenta in un'impresa da record.

Maggiori dettagli in arrivo. Segui i nostri canali social per restare aggiornato!`,
    image: '/img/IMG1.jpg',
    maxParticipants: 500,
    registeredCount: 0,
    price: 0,
    featured: true,
  },
  {
    id: '6',
    slug: 'assaggia-passeggia-quarta-edizione-2026',
    title: 'Assaggia & Passeggia 4 – Calabria Straordinaria',
    date: '2026-08-14',
    time: '19:00',
    location: 'Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'Quarta edizione del percorso enogastronomico più amato di Gasperina: un viaggio tra i sapori e le bellezze della Calabria Straordinaria.',
    fullDescription: `Quarta edizione del percorso enogastronomico più amato di Gasperina. Quest'anno il tema è "Gasperina: un pezzo di Calabria Straordinaria", un omaggio alla ricchezza del territorio calabrese tra gusto, tradizione e bellezza.

Maggiori dettagli in arrivo. Segui i nostri canali social per restare aggiornato!`,
    image: '/img/Event_1.jpeg',
    maxParticipants: 300,
    registeredCount: 0,
    price: 0,
    featured: true,
  },
  {
    id: '7',
    slug: 'festivalbeer-terza-edizione-2026',
    title: 'Festival Beer – 3ª Edizione',
    date: '2026-08-29',
    time: '19:00',
    location: 'Piazzale della Pace, Gasperina',
    category: 'musica',
    description: 'Terza edizione del Festival Beer di Gasperina: musica dal vivo, birra artigianale e sapori calabresi per una serata di festa e convivialità.',
    fullDescription: `Torna il Festival Beer di Gasperina per la terza edizione consecutiva.

Musica, birra artigianale e sapori calabresi per una serata di festa e convivialità. Maggiori dettagli in arrivo. Segui i nostri canali social per restare aggiornato!`,
    image: '/img/IMG_3.jpg',
    maxParticipants: 500,
    registeredCount: 0,
    price: 0,
    featured: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────
export function getEventBySlug(slug: string): Event | undefined {
  return events.find(e => e.slug === slug);
}

export function getFeaturedEvents(): Event[] {
  const today = new Date().toISOString().split('T')[0];
  return events.filter(e => e.featured && e.date >= today);
}
