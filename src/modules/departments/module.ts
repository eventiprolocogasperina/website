import { z } from 'zod';
import { defineModule } from '../types';

/** Reparti e comande della cassa (oggi enableDepartments): schermo reparto e schermo "Pronti" in /cassa (prompt 14). */
export const departments = defineModule({
  key: 'departments',
  name: 'Reparti e comande',
  description: 'Reparti della cassa, comande stampate, schermo cucina.',
  settingsSchema: z.object({ printTickets: z.boolean().default(false), kitchenScreen: z.boolean().default(true), readyScreen: z.boolean().default(false) }),
  settingsLabels: {
    printTickets: { label: 'Stampa le comande' },
    kitchenScreen: { label: 'Schermo cucina' },
    readyScreen: { label: 'Schermo “Pronti” pubblico', help: 'Una pagina senza accesso che mostra solo i numeri pronti, da aprire su un televisore.' },
  },
  pos: { actions: [{ key: 'send-to-department', label: 'Manda in cucina' }] },
});
