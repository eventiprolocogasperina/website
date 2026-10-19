import { z } from 'zod';
import { defineModule } from '../types';

/**
 * Foto dei visitatori. Le foto restano per ora nella tabella `zuccaland_photos`: rinominarla
 * romperebbe il caricamento pubblico di Zuccaland ancora in vendita (§18.10). Diventa
 * `mod_visitor_photos_items` con il prompt 19, quando le tabelle vecchie si rinominano tutte insieme.
 */
export const visitorPhotos = defineModule({
  key: 'visitor-photos',
  name: 'Foto dei visitatori',
  description: 'Caricamento pubblico delle foto, moderazione e galleria.',
  settingsSchema: z.object({
    uploadsOpen: z.boolean().default(true),
    frames: z.string().trim().max(500).default(''),
  }),
  settingsLabels: {
    uploadsOpen: { label: 'Caricamento aperto al pubblico' },
    frames: { label: 'Cornici disponibili', help: 'Nomi separati da virgola.' },
  },
  admin: {
    nav: { label: 'Foto dei visitatori', icon: 'camera', permission: 'photos.moderate', badge: 'photos' },
    closingChecks: [{ key: 'photos-moderated', label: 'Nessuna foto in attesa di moderazione', blocking: false }],
  },
  tables: ['zuccaland_photos'],
});
