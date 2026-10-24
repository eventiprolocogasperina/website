import { z } from 'zod';
import { defineModule } from '../types';

/** Inviti e omaggi: ordini a 0 € con canale "invite", anche in blocco. */
export const invites = defineModule({
  key: 'invites',
  name: 'Inviti e omaggi',
  description: 'Biglietti a 0 € inviati in blocco.',
  settingsSchema: z.object({
    maxPerRecipient: z.number().int().min(1).max(50).default(4),
    message: z.string().trim().max(1000).default(''),
  }),
  settingsLabels: {
    maxPerRecipient: { label: 'Biglietti al massimo per invito' },
    message: { label: 'Messaggio nell’email di invito' },
  },
  admin: { nav: { label: 'Inviti', icon: 'send', permission: 'orders.edit' } },
});
