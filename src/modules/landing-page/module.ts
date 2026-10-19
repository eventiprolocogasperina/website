import { z } from 'zod';
import { defineModule } from '../types';

/** Pagina dedicata a blocchi sotto l'indirizzo del format. Editor con il prompt 17. */
export const landingPage = defineModule({
  key: 'landing-page',
  name: 'Pagina dedicata',
  description: 'Pagina a blocchi sotto l’indirizzo del format.',
  settingsSchema: z.object({ showCountdown: z.boolean().default(true) }),
  settingsLabels: { showCountdown: { label: 'Conto alla rovescia in testa' } },
});
