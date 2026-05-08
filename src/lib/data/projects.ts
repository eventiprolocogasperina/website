// ─── Projects Data ────────────────────────────────────────────
export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'cultura' | 'turismo' | 'ambiente' | 'comunità';
  image: string;
  year: number;
  status: 'completato' | 'in corso' | 'pianificato';
  partners: string[];
}

export const projects: Project[] = [
  {
    id: '1',
    slug: 'mappa-turistica-gasperina',
    title: 'Mappa Turistica di Gasperina',
    description: 'Realizzazione di una mappa turistica digitale e cartacea con tutti i punti di interesse del territorio.',
    category: 'turismo',
    image: '/img/IMG1.jpg',
    year: 2024,
    status: 'completato',
    partners: ['Comune di Gasperina', 'Pro Loco Calabria'],
  },
  {
    id: '2',
    slug: 'valorizzazione-centro-storico',
    title: 'Valorizzazione del Centro Storico',
    description: 'Progetto di recupero e valorizzazione delle vie e piazze del centro storico medievale.',
    category: 'cultura',
    image: '/img/IMG_2.jpg',
    year: 2025,
    status: 'in corso',
    partners: ['Regione Calabria', 'Fondazione Carical'],
  },
  {
    id: '3',
    slug: 'sentieri-natura',
    title: 'Sentieri della Natura Calabrese',
    description: 'Creazione e segnalazione di sentieri naturalistici nei dintorni di Gasperina.',
    category: 'ambiente',
    image: '/img/IMG_3.jpg',
    year: 2025,
    status: 'in corso',
    partners: ['CAI Calabria', 'Parco Naturale Serre'],
  },
];
