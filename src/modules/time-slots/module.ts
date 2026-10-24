import { z } from 'zod';
import { defineModule } from '../types';

/** Fasce orarie: la data si sceglie nel checkout e ogni data ha la sua capienza (sessions.capacity). */
export const timeSlots = defineModule({
  key: 'time-slots',
  name: 'Fasce orarie',
  description: 'Scelta della data nel checkout e capienza per data.',
  settingsSchema: z.object({
    showRemaining: z.boolean().default(true),
    lowThreshold: z.number().int().min(0).max(1000).default(20),
    closeMinutesBefore: z.number().int().min(0).max(1440).default(0),
  }),
  settingsLabels: {
    showRemaining: { label: 'Mostra i posti rimasti', help: 'Nel checkout, accanto a ogni data.' },
    lowThreshold: { label: 'Avviso “ultimi posti” sotto', help: 'Numero di posti.' },
    closeMinutesBefore: { label: 'Chiudi la vendita online prima dell’inizio', help: 'Minuti. 0 = fino all’inizio.' },
  },
  admin: {
    orderPanels: [{ key: 'session', title: 'Data', permission: 'orders.read' }],
    closingChecks: [{ key: 'sessions-closed', label: 'Tutte le date sono chiuse o passate', blocking: false }],
  },
  checkout: { steps: [{ key: 'session', title: 'Scegli la data' }] },
});
