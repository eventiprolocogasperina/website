// ─── Gallery Data ─────────────────────────────────────────────
// GalleryItem is also imported by src/components/admin/GalleryForm.tsx
export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  category: 'eventi' | 'territorio' | 'cultura' | 'comunità' | 'video' | 'assaggia' | 'assaggia26' | 'baguette26';
  width: number;
  height: number;
}

export const galleryItems: GalleryItem[] = [
  {
    id: '1',
    src: '/img/Event_1.jpeg',
    alt: 'Fuochi d\'artificio alla Festa di San Nicola',
    category: 'eventi',
    width: 1366,
    height: 910,
  },
  {
    id: '2',
    src: '/img/IMG1.jpg',
    alt: 'Vista del centro storico di Gasperina al tramonto',
    category: 'territorio',
    width: 1080,
    height: 1080,
  },
  {
    id: '3',
    src: '/img/IMG_2.jpg',
    alt: 'Vista aerea di Gasperina al crepuscolo',
    category: 'territorio',
    width: 1080,
    height: 1080,
  },
  {
    id: '4',
    src: '/img/IMG_3.jpg',
    alt: 'Gasperina vista dall\'alto di notte',
    category: 'territorio',
    width: 1080,
    height: 1080,
  },
];
