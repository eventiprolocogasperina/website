import { z } from 'zod';
import { defineModule } from '../types';

/** Messaggi ai partecipanti: WhatsApp ed email a un gruppo (per data, per check-in). */
export const broadcast = defineModule({
  key: 'broadcast',
  name: 'Messaggi ai partecipanti',
  description: 'WhatsApp ed email a un gruppo di partecipanti.',
  settingsSchema: z.object({
    whatsapp: z.boolean().default(true),
    email: z.boolean().default(true),
  }),
  settingsLabels: { whatsapp: { label: 'Invio su WhatsApp' }, email: { label: 'Invio per email' } },
  admin: { nav: { label: 'Messaggi', icon: 'megaphone', permission: 'orders.edit' } },
});
