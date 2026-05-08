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
  price: number; // 0 = gratuito
  featured: boolean;
}

export const events: Event[] = [
  {
    id: '1',
    slug: 'festa-patronale-san-nicola-2025',
    title: 'Festa Patronale di San Nicola',
    date: '2025-08-06',
    time: '20:00',
    location: 'Piazza Centrale, Gasperina',
    category: 'cultura',
    description: 'La tradizionale festa del patrono San Nicola con processione, fuochi d\'artificio e musica dal vivo.',
    fullDescription: `La Festa Patronale di San Nicola è l'evento più atteso dell'anno a Gasperina. 
Ogni anno, la comunità si riunisce per celebrare il Santo Patrono con una serie di eventi 
che mescolano devozione religiosa, tradizioni popolari e grande festa collettiva.

Il programma prevede la solenne Messa Pontificale alle ore 10:00, seguita dalla processione 
per le vie del centro storico nel pomeriggio. La serata si apre con musica dal vivo in piazza 
e si conclude con uno straordinario spettacolo di fuochi d'artificio.`,
    image: '/img/Event_1.jpeg',
    maxParticipants: 500,
    registeredCount: 287,
    price: 0,
    featured: true,
  },
  {
    id: '2',
    slug: 'sagra-del-fico-2025',
    title: 'Sagra del Fico e dei Prodotti Locali',
    date: '2025-08-15',
    time: '18:00',
    location: 'Centro Storico, Gasperina',
    category: 'gastronomia',
    description: 'Degustazione di fichi, prodotti locali, vino calabrese e artigianato tradizionale.',
    fullDescription: `La Sagra del Fico celebra uno dei prodotti più preziosi del territorio calabrese. 
Bancarelle con prodotti tipici locali, degustazioni di vino, fichi secchi e dolci tradizionali.
Laboratori per bambini sull'agricoltura locale e dimostrazioni di artigianato.`,
    image: '/img/IMG1.jpg',
    maxParticipants: 300,
    registeredCount: 145,
    price: 0,
    featured: true,
  },
  {
    id: '3',
    slug: 'notte-bianca-culturale-2025',
    title: 'Notte Bianca Culturale',
    date: '2025-07-19',
    time: '21:00',
    location: 'Vie del Centro, Gasperina',
    category: 'cultura',
    description: 'Una notte di arte, musica e spettacoli nelle vie del centro storico di Gasperina.',
    fullDescription: `La Notte Bianca Culturale trasforma il centro storico di Gasperina in un grande palcoscenico. 
Mostre d'arte, performance musicali, teatro di strada e installazioni luminose animano le vie del borgo 
fino a tarda notte. Un evento per tutta la famiglia che celebra l'identità culturale del territorio.`,
    image: '/img/IMG_2.jpg',
    maxParticipants: 400,
    registeredCount: 220,
    price: 0,
    featured: false,
  },
  {
    id: '4',
    slug: 'escursione-serre-calabresi-2025',
    title: 'Escursione nelle Serre Calabresi',
    date: '2025-09-14',
    time: '08:00',
    location: 'Ritrovo: Piazza Roma, Gasperina',
    category: 'sport',
    description: 'Trekking guidato tra i boschi delle Serre Calabresi con guida naturalistica.',
    fullDescription: `Un\'escursione guidata alla scoperta della natura straordinaria delle Serre Calabresi. 
Il percorso ad anello di circa 12 km offre panorami mozzafiato sul Mar Ionio e attraversa boschi 
di faggio e castagno. La guida naturalistica illustrerà la flora e fauna locale.
Difficoltà: media. Attrezzatura adeguata richiesta.`,
    image: '/img/IMG_3.jpg',
    maxParticipants: 30,
    registeredCount: 18,
    price: 5,
    featured: false,
  },
  {
    id: '5',
    slug: 'concerto-estate-2025',
    title: 'Concerto Estate: Musica sotto le Stelle',
    date: '2025-07-26',
    time: '21:30',
    location: 'Piazza Centrale, Gasperina',
    category: 'musica',
    description: 'Serata musicale con band locali e ospiti speciali sotto il cielo stellato di Gasperina.',
    fullDescription: `Una serata indimenticabile di musica live in piazza. 
Si alternano sul palco band locali ed artisti ospiti in una scaletta che spazia 
dal folk calabrese alla musica d'autore italiana. Ingresso libero, sedie disponibili in piazza.`,
    image: '/img/Event_1.jpeg',
    maxParticipants: 600,
    registeredCount: 412,
    price: 0,
    featured: true,
  },
];

export function getEventBySlug(slug: string): Event | undefined {
  return events.find(e => e.slug === slug);
}

export function getFeaturedEvents(): Event[] {
  return events.filter(e => e.featured);
}

export function getEventsByCategory(cat: Event['category']): Event[] {
  return events.filter(e => e.category === cat);
}
