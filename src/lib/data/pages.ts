import { neon } from '@neondatabase/serverless';

export interface AssaggiaEPasseggiaContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    bgImageUrl: string;
    logoUrl: string;
    ctaText: string;
    ctaLink: string;
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
  };
  tappe: Array<{
    id: string; // "1", "2", ecc
    title: string;
    description: string;
    wineName: string;
    wineryName: string;
    location: string;
    themeColor: string; // es: "var(--blue-500)"
    allergens?: string; // Nuova prop per gli allergeni
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
}

// Default content used if nothing is found in the DB
export const DEFAULT_ASSAGGIA_CONTENT: AssaggiaEPasseggiaContent = {
  hero: {
    badge: '10 Agosto 2026 • Gasperina (CZ)',
    title: 'Assaggia & Passeggia',
    subtitle: 'Un percorso enogastronomico indimenticabile tra i vicoli storici del borgo. Otto tappe di puro gusto, cantine selezionate e musica popolare.',
    bgImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop', // Soft wine/vineyard background placeholder
    logoUrl: '/img/LOGO_ap_ga.png',
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
    priceInfo: '15€',
    ctaText: "Procedi all'Acquisto",
    ctaLink: '/assaggia-e-passeggia/ticket',
  }
};

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
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
