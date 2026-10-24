import { z } from 'zod';
import { defineModule } from '../types';

/**
 * Rinvio per maltempo, con la regola di Zuccaland: una data rinviata passa alla sua data di recupero
 * (gli ordini e i biglietti restano validi), il cliente riceve un'email, sul sito compare l'avviso.
 * Al secondo rinvio consecutivo l'acquirente ha diritto al rimborso integrale.
 */
export const postponement = defineModule({
  key: 'postponement',
  name: 'Rinvio per maltempo',
  description: 'Rinvia una data alla data di recupero: ordini spostati, email ai clienti, avviso sul sito, rimborso al secondo rinvio.',
  dependsOn: ['time-slots'],
  settingsSchema: z.object({
    notifyByEmail: z.boolean().default(true),
    noticeTitle: z.string().trim().max(120).default('Avviso importante: rinvio per maltempo'),
    noticeMessage: z
      .string()
      .trim()
      .max(1000)
      .default('Causa condizioni meteo avverse l’evento è rinviato alla data di recupero. I biglietti già acquistati restano validi per la nuova data.'),
    refundOnSecondPostponement: z.boolean().default(true),
    allowCustomerChange: z.boolean().default(false),
  }),
  settingsLabels: {
    notifyByEmail: { label: 'Avvisa i clienti via email', help: 'A ogni ordine spostato, con la nuova data.' },
    noticeTitle: { label: 'Titolo dell’avviso sul sito', help: 'Compare sulla pagina dell’edizione finché c’è una data rinviata non ancora svolta.' },
    noticeMessage: { label: 'Testo dell’avviso sul sito' },
    refundOnSecondPostponement: { label: 'Rimborso al secondo rinvio', help: 'Se anche la data di recupero viene rinviata, gli acquirenti possono chiedere il rimborso integrale.' },
    allowCustomerChange: { label: 'Il cliente può cambiare data da solo', help: 'Da “I miei biglietti”, con il sito nuovo (fase 4).' },
  },
  admin: {
    nav: { label: 'Rinvii', icon: 'cloud', permission: 'orders.edit' },
    orderActions: [{ key: 'move-session', label: 'Sposta data', permission: 'orders.edit' }],
    orderPanels: [{ key: 'postponement', title: 'Rinvii', permission: 'orders.read' }],
  },
});
