import { z } from 'zod';
import { defineModule } from '../types';

/** Percorso a tappe (Assaggia e Passeggia): tappe con mappa, menu e QR stabile. Interfaccia con il prompt 17. */
export const routeStops = defineModule({
  key: 'route-stops',
  name: 'Percorso a tappe',
  description: 'Tappe con mappa, menu e QR stabile per tappa.',
  settingsSchema: z.object({ showMap: z.boolean().default(true) }),
  settingsLabels: { showMap: { label: 'Mostra la mappa del percorso' } },
});
