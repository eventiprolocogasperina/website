import { z } from 'zod';
import { defineModule } from '../types';

/** Recensioni dell'edizione. Interfaccia completa con il prompt 14. */
export const reviews = defineModule({
  key: 'reviews',
  name: 'Recensioni',
  description: 'Raccolta e moderazione delle recensioni.',
  settingsSchema: z.object({ collectAfterEvent: z.boolean().default(true), showOnPage: z.boolean().default(true) }),
  settingsLabels: { collectAfterEvent: { label: 'Chiedi una recensione dopo l’evento' }, showOnPage: { label: 'Mostra le recensioni sulla pagina' } },
  admin: { nav: { label: 'Recensioni', icon: 'star', permission: 'reviews.moderate' } },
  tables: ['reviews'],
});
