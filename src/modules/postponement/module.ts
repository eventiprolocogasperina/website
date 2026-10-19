import { z } from 'zod';
import { defineModule } from '../types';

/** Rinvio date: sposta ordini tra le date dell'edizione, con email e storico. */
export const postponement = defineModule({
  key: 'postponement',
  name: 'Rinvio date',
  description: 'Sposta ordini tra date, con email automatica e storico.',
  dependsOn: ['time-slots'],
  settingsSchema: z.object({
    notifyByEmail: z.boolean().default(true),
    allowCustomerChange: z.boolean().default(false),
  }),
  settingsLabels: {
    notifyByEmail: { label: 'Avvisa il cliente via email', help: 'Con il modello “postponement”.' },
    allowCustomerChange: { label: 'Il cliente può cambiare data da “I miei biglietti”', help: 'Arriva con il sito pubblico (fase 4).' },
  },
  admin: { orderActions: [{ key: 'move-session', label: 'Sposta data', permission: 'orders.edit' }] },
});
