import { z } from 'zod';
import { defineModule } from '../types';

/** Pagamento con link: un ordine creato dall'admin che il cliente paga da un link (48 ore). */
export const paylink = defineModule({
  key: 'paylink',
  name: 'Pagamento con link',
  description: 'Ordini creati dall’admin e pagati con un link.',
  settingsSchema: z.object({ validityHours: z.number().int().min(1).max(168).default(48) }),
  settingsLabels: { validityHours: { label: 'Validità del link', help: 'Ore. Poi l’ordine scade e i posti si liberano.' } },
  admin: { orderActions: [{ key: 'paylink', label: 'Crea link di pagamento', permission: 'orders.edit' }] },
});
