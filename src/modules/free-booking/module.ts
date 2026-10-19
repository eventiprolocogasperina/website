import { z } from 'zod';
import { defineModule } from '../types';

/** Prenotazione gratuita: ordini a 0 € con capienza, senza pagamento. Interfaccia con il prompt 14. */
export const freeBooking = defineModule({
  key: 'free-booking',
  name: 'Prenotazione gratuita',
  description: 'Iscrizione senza pagamento, con capienza.',
  settingsSchema: z.object({ maxPerBooking: z.number().int().min(1).max(50).default(6), askPhone: z.boolean().default(true) }),
  settingsLabels: { maxPerBooking: { label: 'Persone al massimo per prenotazione' }, askPhone: { label: 'Chiedi il telefono' } },
});
