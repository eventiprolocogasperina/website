// ─── Event Data ───────────────────────────────────────────────
export interface Event {
  id: string;
  slug: string;
  title: string;
  date: string;          // ISO date for sorting. Use "2026-08-01" for approx.
  dateLabel?: string;    // Override displayed date (e.g. "Ago 2026")
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
  bookable: boolean;     // Show booking form only when true AND event is upcoming
}

export const events: Event[] = [
  // ── Prossimi 2026 (più recenti prima) ─────────────────────────
  {
    id: '11',
    slug: 'natale-nel-borgo-2026',
    title: 'Natale nel Borgo – 4ª Edizione',
    date: '2026-12-01',
    dateLabel: 'Dic 2026',
    time: 'TBD',
    location: 'Centro Storico, Gasperina',
    category: 'cultura',
    description: 'Il borgo si accende con l\'atmosfera natalizia: luci, mercatini, musica, sapori tipici e il grande albero in Piazza. Un appuntamento per tutta la famiglia.',
    fullDescription: `L'anno si conclude con uno degli appuntamenti più attesi.

Il borgo si accende con l'atmosfera natalizia: luci, musica, sapori tipici e momenti di intrattenimento per tutte le età. Tra gli elementi centrali, l'accensione del grande albero in Piazza e il ritorno di "Natale nel Borgo", iniziativa realizzata in collaborazione con l'amministrazione comunale, che trasforma il centro storico in un luogo di incontro e condivisione durante le festività.

Le vie di Gasperina si animano con mercatini, installazioni luminose e spazi dedicati alla tradizione, offrendo ai visitatori un'esperienza calda e autentica. Non mancheranno momenti dedicati ai più piccoli e occasioni conviviali per gli adulti, tra musica dal vivo e sapori di stagione.

Maggiori dettagli in arrivo. Segui i nostri canali social!`,
    image: '/img/IMG_3.jpg',
    maxParticipants: 500,
    registeredCount: 0,
    price: 0,
    featured: false,
    bookable: false,
  },
  {
    id: '10',
    slug: 'villaggio-delle-zucche-2026',
    title: 'Il Villaggio delle Zucche – 2ª Edizione',
    date: '2026-10-01',
    dateLabel: 'Ott 2026',
    time: 'TBD',
    location: 'Gasperina',
    category: 'comunità',
    description: 'Seconda edizione del Villaggio delle Zucche: un\'atmosfera magica tra installazioni, intrattenimento e sapori autunnali per grandi e piccini.',
    fullDescription: `Seconda edizione del Villaggio delle Zucche, uno degli appuntamenti più amati dell'autunno gasperinese.

Un'atmosfera magica tra installazioni, intrattenimento e sapori autunnali per grandi e piccini. Maggiori dettagli in arrivo. Segui i nostri canali social!`,
    image: '/img/IMG1.jpg',
    maxParticipants: 300,
    registeredCount: 0,
    price: 0,
    featured: false,
    bookable: false,
  },
  {
    id: '9',
    slug: 'viaggio-pompei-caserta-2026',
    title: 'Viaggio Organizzato – Pompei & Caserta',
    date: '2026-09-01',
    dateLabel: 'Set 2026',
    time: 'TBD',
    location: 'Partenza da Gasperina',
    category: 'cultura',
    description: 'Gita organizzata dalla Pro Loco Gasperina alla scoperta di Pompei e della Reggia di Caserta: storia, arte e bellezza a portata di mano.',
    fullDescription: `Gita organizzata dalla Pro Loco Gasperina alla scoperta di Pompei e della Reggia di Caserta.

Un viaggio tra storia, arte e bellezza per i soci e i simpatizzanti della Pro Loco. Maggiori dettagli e modalità di iscrizione in arrivo. Segui i nostri canali social!`,
    image: '/img/IMG_2.jpg',
    maxParticipants: 50,
    registeredCount: 0,
    price: 0,
    featured: false,
    bookable: false,
  },
  {
    id: '7',
    slug: 'festivalbeer-terza-edizione-2026',
    title: 'Festival Beer – 3ª Edizione',
    date: '2026-08-03',
    dateLabel: 'Ago 2026',
    time: 'TBD',
    location: 'Piazzale della Pace, Gasperina',
    category: 'musica',
    description: 'Terza edizione del Festival Beer di Gasperina: musica dal vivo, birra artigianale calabrese e sapori locali per una serata di festa e convivialità.',
    fullDescription: `Torna il Festival Beer di Gasperina per la terza edizione consecutiva, scegliendo un periodo più favorevole per amplificare partecipazione, energia e coinvolgimento.

FestivalBeer prosegue il suo percorso di valorizzazione della scena musicale calabrese, dando spazio sia ad artisti emergenti che a nomi già affermati che hanno segnato le precedenti edizioni, come Tatho, Mimmo Cavallaro e Cecè Berretta.

Accanto alla musica, cresce il focus sulla cultura della birra, con un'offerta che unisce prodotti commerciali e una selezione di birre artigianali calabresi, promuovendo qualità, sperimentazione e valorizzazione delle realtà locali.

Maggiori dettagli in arrivo. Segui i nostri canali social!`,
    image: '/img/IMG_3.jpg',
    maxParticipants: 500,
    registeredCount: 0,
    price: 0,
    featured: true,
    bookable: false,
  },
  {
    id: '6',
    slug: 'assaggia-passeggia-quarta-edizione-2026',
    title: 'Assaggia & Passeggia 4 – Calabria Straordinaria',
    date: '2026-08-01',
    dateLabel: 'Ago 2026',
    time: 'TBD',
    location: 'Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'Quarta edizione: un itinerario enogastronomico ed esperienziale in cui degustazione e narrazione si intrecciano, raccontando Gasperina come espressione autentica della Calabria.',
    fullDescription: `L'evento simbolo della Pro Loco torna con una nuova edizione ancora più immersiva e identitaria, costruita attorno a un'idea precisa: Gasperina non è solo un luogo, ma un'espressione autentica della Calabria straordinaria.

Il percorso non racconterà la Calabria in senso generale, ma partirà da Gasperina per far emergere, attraverso le sue tradizioni, i suoi sapori e le sue storie, l'essenza più vera di un'intera regione.

Ogni tappa sarà un frammento di identità locale che, nel suo essere unico, diventa rappresentativo di una Calabria viva, resistente e profondamente autentica. I partecipanti saranno accompagnati lungo un itinerario enogastronomico ed esperienziale in cui degustazione e narrazione si intrecciano: piatti tipici, racconti, atmosfere e dettagli del borgo daranno vita a un'esperienza immersiva, capace di coinvolgere tutti i sensi.

Maggiori dettagli in arrivo. Segui i nostri canali social!`,
    image: '/img/Event_1.jpeg',
    maxParticipants: 300,
    registeredCount: 0,
    price: 0,
    featured: true,
    bookable: false,
  },
  {
    id: '5',
    slug: 'la-baguette-da-record-2026',
    title: 'La Baguette da Record',
    date: '2026-08-03',
    dateLabel: 'Ago 2026',
    time: 'TBD',
    location: 'Corso Principale, Gasperina',
    category: 'comunità',
    description: 'Un filone di pane lunghissimo farcito con i tradizionali "pipi e patati" attraverserà il corso di Gasperina puntando a un nuovo record di lunghezza.',
    fullDescription: `Un evento originale e spettacolare che punta a lasciare il segno.

Un lunghissimo filone di pane, farcito con i tradizionali "pipi e patati", attraverserà il corso di Gasperina con l'obiettivo di stabilire un nuovo record di lunghezza.

Un momento di festa collettiva, capace di unire tradizione, creatività e spirito di comunità.

Maggiori dettagli in arrivo. Segui i nostri canali social!`,
    image: '/img/IMG1.jpg',
    maxParticipants: 500,
    registeredCount: 0,
    price: 0,
    featured: true,
    bookable: false,
  },
  {
    id: '4',
    slug: 'assaggia-passeggia-the-experience-2026',
    title: 'Assaggia & Passeggia – The Experience',
    date: '2026-07-01',
    dateLabel: 'Lug 2026',
    time: 'TBD',
    location: 'Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'I partecipanti non saranno semplici spettatori: guidati da Nonna Maria, prenderanno parte alla preparazione di piatti tipici gasperinesi, seguita da una passeggiata narrativa tra le vie del borgo.',
    fullDescription: `Un'esperienza autentica e coinvolgente, pensata come evoluzione del format principale.

I partecipanti non saranno semplici spettatori, ma veri protagonisti: guidati dalla sapienza di Nonna Maria, prenderanno parte alla preparazione di piatti tipici della tradizione gasperinese.

Durante i tempi di cottura, l'esperienza si arricchisce con passeggiate informative tra le vie del borgo, alla scoperta della storia, dei luoghi e dell'identità culturale di Gasperina.

Un perfetto equilibrio tra cucina, racconto e territorio.

Maggiori dettagli in arrivo. Segui i nostri canali social!`,
    image: '/img/IMG_2.jpg',
    maxParticipants: 30,
    registeredCount: 0,
    price: 0,
    featured: false,
    bookable: false,
  },

  // ── Passati (più recenti prima) ───────────────────────────────
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

Dopo il successo della prima edizione, il festival torna con un programma ricco di energia e gusto. La serata viene aperta dai Takabum Street Band, con il loro mix di funk, sonorità mediterranee, swing, ska e world music, tra brani originali e rivisitazioni dei grandi classici jazz e della canzone italiana. A seguire, il concerto di Cecè Berretta, artista calabrese amatissimo dal pubblico e protagonista di un tour che ha riempito piazze in tutta Italia.

Il pubblico degusta birra artigianale calabrese Birra Gladium e birre tedesche accompagnate da stand gastronomici con le migliori prelibatezze del territorio, per una serata di festa che celebra allegria, tradizione birraia e convivialità.`,
    image: '/img/IMG_3.jpg',
    maxParticipants: 500,
    registeredCount: 500,
    price: 0,
    featured: false,
    bookable: false,
  },
  {
    id: '2',
    slug: 'assaggia-passeggia-creuza-de-ma-2025',
    title: 'Assaggia & Passeggia 3 – Creuza de mä',
    date: '2025-08-11',
    time: '19:00',
    location: 'Via Trento e Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'Terza edizione dedicata a Fabrizio De André: un percorso enogastronomico tra le vie di Gasperina con menù a base di pesce e concerto finale dei Faber Quartet.',
    fullDescription: `Nel cuore dell'estate calabrese torna uno degli appuntamenti più attesi: il borgo di Gasperina ospita la terza edizione di "Assaggia & Passeggia", dedicata a Fabrizio De André con il titolo evocativo: "Creuza de mä".

Proprio come le strette vie liguri che conducono al mare, anche le strade di Gasperina diventano un percorso sensoriale tra sapori, suggestioni e musica. A partire da via Trento, il borgo si trasforma in una "creuza" calabrese: un itinerario enogastronomico e culturale che attraversa il centro storico, arricchito da installazioni a tema marino, decorazioni artigianali e angoli che raccontano il Mediterraneo attraverso gli occhi e le parole di De André.

Durante la passeggiata viene degustato un menu a base di pesce, realizzato con prodotti locali e ispirato alla cucina tradizionale reinterpretata in chiave creativa.

A chiudere la serata, alle ore 22:00 in piazza E. Fermi, il concerto dei Faber Quartet: un omaggio emozionante ai capolavori di De André, tra note, parole e memoria condivisa.`,
    image: '/img/IMG1.jpg',
    maxParticipants: 300,
    registeredCount: 300,
    price: 0,
    featured: false,
    bookable: false,
  },
  {
    id: '1',
    slug: 'festivalbeer-prima-edizione-2024',
    title: 'Festival Beer – 1ª Edizione',
    date: '2024-10-12',
    time: '19:00',
    location: 'Piazzale della Pace, Gasperina',
    category: 'musica',
    description: 'La prima edizione della Festa della Birra a Gasperina: musica dal vivo con Mimmo Cavallaro e Tatho, stand gastronomici con le specialità locali.',
    fullDescription: `La prima edizione della Festa della Birra a Gasperina, un appuntamento imperdibile a partire dalle ore 19:00.

La serata è caratterizzata da un ricco programma musicale, con il concerto di Mimmo Cavallaro e l'esibizione di Tatho. Gli stand gastronomici propongono le specialità locali, tra cui il rinomato panino con la salsiccia.`,
    image: '/img/Event_1.jpeg',
    maxParticipants: 500,
    registeredCount: 500,
    price: 0,
    featured: false,
    bookable: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────
export function getEventBySlug(slug: string): Event | undefined {
  return events.find(e => e.slug === slug);
}

export function isEventPast(event: Event): boolean {
  const today = new Date().toISOString().split('T')[0];
  return event.date < today;
}

export function getUpcomingEvents(): Event[] {
  const today = new Date().toISOString().split('T')[0];
  return events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}
