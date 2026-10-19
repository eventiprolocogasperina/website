import { z } from 'zod';
import { defineModule } from '../types';

/** Reparti e comande della cassa (oggi enableDepartments). Interfaccia con il prompt 15. */
export const departments = defineModule({
  key: 'departments',
  name: 'Reparti e comande',
  description: 'Reparti della cassa, comande stampate, schermo cucina.',
  settingsSchema: z.object({ printTickets: z.boolean().default(false), kitchenScreen: z.boolean().default(true) }),
  settingsLabels: { printTickets: { label: 'Stampa le comande' }, kitchenScreen: { label: 'Schermo cucina' } },
  pos: { actions: [{ key: 'send-to-department', label: 'Manda in cucina' }] },
});
