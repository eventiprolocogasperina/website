import { neon } from '@neondatabase/serverless';

export interface TappaRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string; // Markdown supported
  instructions: string; // Markdown supported
  prepTime?: string;
  difficulty?: string;
  photoUrl?: string;
}

export interface AssaggiaEPasseggiaContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    bgImageUrl: string;
    logoUrl: string;
    ctaText: string;
    ctaLink: string;
    heroVideoUrl?: string; // Nuova prop per il video background (YouTube)
  };
  story: {
    title: string;
    paragraph1: string;
    paragraph2: string;
    image1Url: string;
    image2Url: string;
  };
  menu: {
    subtitle: string;
    title: string;
    pdfUrl?: string; // Uploaded PDF file for the menu
  };
  tappe: Array<{
    id: string; // "1", "2", ecc
    title: string;
    description: string;
    recipes?: TappaRecipe[];
    tappaMenu?: {
      dishName: string;
      description: string;
      ingredients?: string;
    };
    wineName: string;
    wineryName: string;
    location: string | {
      name: string;
      lat: number;
      lng: number;
      mapLabel?: string;
      googleMapsUrl?: string;
    };
    themeColor: string; // es: "var(--blue-500)"
    allergens?: string; // Nuova prop per gli allergeni
    introText?: string; // Testo introduttivo della tappa
    curiosities?: string;
    extraInfo?: string;
    photos?: string[]; // Array of photo URLs
    hasTasting?: boolean; // Flag to indicate if the tappa includes a food/wine tasting
  }>;
  presale: {
    title: string;
    subtitle: string;
    priceInfo: string;
    ctaText: string;
    ctaLink: string;
  };
  logistics: {
    ticketInfo: string;
    parkingInfo: string;
    disclaimer: string;
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

// Zuccaland
export interface ZuccalandInfoCard {
  emoji: string;
  title: string;
  description: string;
  color: string;
  items: string[];
}

export interface ZuccalandTicketType {
  id: string;
  label: string;
  price: number;
  description: string;
  emoji: string;
  isExtra: boolean;
}

export interface ZuccalandFreeActivity {
  id: string;
  label: string;
  details: string;
}

export interface ZuccalandHighlight {
  icon: string; // 'shopping-bag' | 'music' | 'coffee' | etc.
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
}

export interface ZuccalandContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    description: string;
  };
  event: {
    startDate: string;      // ISO datetime
    endDate: string;        // ISO datetime
    salesOpenDate: string;   // ISO datetime — when ticket sales open
    salesCloseDate: string;  // ISO datetime — when ticket sales close
  };
  infoCards: ZuccalandInfoCard[];
  ticketTypes: ZuccalandTicketType[];
  freeActivities: ZuccalandFreeActivity[];
  highlights: ZuccalandHighlight[];
  program: {
    title: string;
    content: string; // Markdown supported
  };
  tickets: {
    title: string;
    disclaimer: string;
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export const DEFAULT_ZUCCALAND_CONTENT: ZuccalandContent = {
  hero: {
    badge: '10-11 Ottobre 2026 • Gasperina',
    title: 'Zuccaland',
    subtitle: 'Il villaggio delle zucche di Gasperina',
    description: 'Un\'esperienza incantata tra colori autunnali, laboratori per grandi e piccini, e tante degustazioni da leccarsi i baffi.',
  },
  event: {
    startDate: '2026-10-10T09:00:00+02:00',
    endDate: '2026-10-11T23:59:00+02:00',
    salesOpenDate: '2026-09-01T00:00:00+02:00',
    salesCloseDate: '2026-10-10T08:00:00+02:00',
  },
  infoCards: [
    {
      emoji: '🎨',
      title: 'Laboratori Creativi',
      description: 'Tutte le attività sono gratuite, incluse nel biglietto e supervisionate. Sceglile nel checkout!',
      color: '#fef08a',
      items: [
        '🎃 Zucca in Vaso · Età 3-7 · Solo Sabato',
        '🖌️ Zuccart · Età 3-7 · Sempre aperto',
        '🧟 Facepainting & Thriller Dance · Dai 6 anni',
      ],
    },
    {
      emoji: '🎯',
      title: 'Giochi e Attrazioni',
      description: 'Tanto divertimento per tutta la famiglia con giochi a tema e set fotografici spettacolari.',
      color: '#fed7aa',
      items: [
        '🌾 Labirinto di balle di fieno',
        '🎳 Gioco dei barattoli & degli anelli',
        '🎲 Tris di zucca & Zuccapong',
        '📸 Campo delle zucche & Postazioni photo',
      ],
    },
    {
      emoji: '🥧',
      title: 'Food & Beverage',
      description: 'Gustose prelibatezze e bevande autunnali per deliziare il palato.',
      color: '#fbcfe8',
      items: [
        '🌭 Panino salsiccia, crema di zucca e pancetta',
        '🍩 Frittelle di zucca calde',
        '🧁 Merenda bimbi · Muffin, pop corn',
        '🥧 Torta camilla, Pumpkin Pie, Torta di Mele',
      ],
    },
  ],
  ticketTypes: [
    { id: 'ingresso', label: 'Ingresso Ordinario', price: 5, description: 'Ingresso all\'evento Zuccaland', emoji: 'pumpkin', isExtra: false },
    { id: 'laboratorio', label: 'You Pick Lab', price: 3, description: 'Scegli la tua zucca e intagliala o dipingila come preferisci!', emoji: '🎨', isExtra: true },
  ],
  freeActivities: [
    { id: 'zucca_vaso', label: 'Zucca in Vaso (3-7 anni)', details: 'Sabato 14:30 - 16:30. A cura di Bibl. Comunale "S. Grande". Max 60 posti.' },
    { id: 'zuccart', label: 'Zuccart (3-7 anni)', details: 'Sempre aperto. A cura della Pro Loco.' },
    { id: 'facepainting', label: 'Facepainting & Thriller Dance (6+)', details: 'A cura di Vanessa Aiello.' },
  ],
  highlights: [
    { icon: 'shopping-bag', title: 'Merchandising', description: 'Acquista un ricordo esclusivo dell\'evento presso il nostro stand dedicato.', bgColor: '#ea580c', textColor: '#ffffff' },
    { icon: 'music', title: 'Musica dal Vivo', description: 'Intrattenimento musicale per accompagnare le tue serate al villaggio.', bgColor: '#431407', textColor: '#fdba74' },
  ],
  program: {
    title: 'Programma dell\'Evento',
    content: 'Stiamo lavorando agli ultimi dettagli stregati! 🧙‍♀️✨\n\nIl programma completo sarà svelato a breve.',
  },
  tickets: {
    title: 'Riserva il tuo posto!',
    disclaimer: 'Le degustazioni culinarie agli stand non sono comprese nel prezzo del biglietto di ingresso.',
  },
};

// Default content used if nothing is found in the DB
export const DEFAULT_ASSAGGIA_CONTENT: AssaggiaEPasseggiaContent = {
  hero: {
    badge: '10 Agosto 2026 • Piazza Enrico Fermi, Gasperina',
    title: 'Assaggia & Passeggia',
    subtitle: 'Un itinerario enogastronomico scenografico ed esperienziale tra i vicoli di Gasperina. Quattro tappe di puro gusto e vino locale alla scoperta delle nostre radici.',
    bgImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop', // Soft wine/vineyard background placeholder
    logoUrl: '/img/LogoAP_GA_nero.png',
    heroVideoUrl: '', // Default vuoto
    ctaText: 'Acquista il tuo Biglietto',
    ctaLink: '/assaggia-e-passeggia/ticket',
  },
  story: {
    title: 'La nostra Storia',
    paragraph1: 'Nato dall\'amore per le nostre radici, Assaggia & Passeggia non è solo un evento, ma un vero e proprio viaggio sensoriale. Attraverso le strette "rughe" (i vicoli) di Gasperina, riporteremo in vita gli antichi sapori della tradizione calabrese.',
    paragraph2: 'L\'obiettivo della Pro Loco è di farvi innamorare del nostro borgo, creando un momento di condivisione autentica tra abitanti e visitatori, all\'insegna della buona musica e dell\'eccellenza culinaria.',
    image1Url: 'https://images.unsplash.com/photo-1559564484-e48b3e040ff4?q=80&w=800&auto=format&fit=crop',
    image2Url: 'https://images.unsplash.com/photo-1560053608-13721e06ee52?q=80&w=800&auto=format&fit=crop',
  },
  menu: {
    subtitle: 'Il Percorso',
    title: 'Il Menù Degustazione',
  },
  tappe: [
    {
      id: "1",
      title: "Aperitivo di Benvenuto",
      description: "Bruschette con olio extravergine novello.",
      wineName: "Vino Bianco",
      wineryName: "Cantina Locale",
      location: "Piazza",
      themeColor: "var(--gold-500)",
      allergens: "Glutine"
    }
  ],
  logistics: {
    ticketInfo: "L'inizio del ritiro dei ticket di ingresso è previsto dalle 19:15, l'ingresso sarà consentito dalle 19:30. La mail ricevuta o il ticket acquistato presso l'Emporio Vono valgono come prenotazione del titolo di ingresso che andrà comunque ritirato in loco, allo stand dedicato.",
    parkingInfo: "Aree di sosta gratuite predisposte all'ingresso del paese.",
    disclaimer: "Purtroppo per l'impostazione dell'evento non ci è possibile garantire menù specifici per celiaci o intolleranze gravi."
  },
  presale: {
    title: 'Prevendita Aperta',
    subtitle: 'Acquista ora il tuo ticket in prevendita. I posti sono limitati per garantire la migliore esperienza.',
    priceInfo: '17€',
    ctaText: "Procedi all'Acquisto",
    ctaLink: '/assaggia-e-passeggia/ticket',
  },
  faqs: [
    {
      question: "I bambini pagano?",
      answer: "L'ingresso è gratuito per i bambini sotto i 6 anni. Non c'è un menù bimbi dedicato."
    },
    {
      question: "Posso pagare in loco?",
      answer: "Consigliamo l'acquisto in prevendita online o presso i nostri point autorizzati per garantirti il posto, i posti sono limitati."
    }
  ]
};

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL, { fetchOptions: { cache: 'no-store' } });
}

export async function getPageContent<T>(slug: string, defaultData: T): Promise<T> {
  try {
    const sql = getDb();
    const result = await sql`SELECT content FROM pages_content WHERE slug = ${slug} LIMIT 1`;
    
    if (result.length > 0) {
      return result[0].content as T;
    }
    
    return defaultData;
  } catch (error) {
    console.error(`Failed to get page content for ${slug}:`, error);
    return defaultData; // Fallback in caso di errore (o se la tabella non esiste ancora)
  }
}

export async function savePageContent<T>(slug: string, content: T): Promise<boolean> {
  try {
    const sql = getDb();
    
    // Upsert logic (Insert or Update if exists)
    await sql`
      INSERT INTO pages_content (slug, content, "updatedAt")
      VALUES (${slug}, ${content as any}, CURRENT_TIMESTAMP)
      ON CONFLICT (slug) DO UPDATE
      SET content = EXCLUDED.content,
          "updatedAt" = CURRENT_TIMESTAMP
    `;
    
    return true;
  } catch (error) {
    console.error(`Failed to save page content for ${slug}:`, error);
    return false;
  }
}
