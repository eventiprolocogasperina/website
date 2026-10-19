import { z } from 'zod';
import { defineModule } from '../types';

export const QuestionSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Solo minuscole, numeri e _.'),
  label: z.string().trim().min(2).max(120),
  type: z.enum(['text', 'number', 'choice', 'age']).default('text'),
  /** Per "choice": opzioni separate da virgola. */
  options: z.string().trim().max(500).default(''),
  required: z.boolean().default(false),
  /** true: una risposta per biglietto; false: una per ordine. */
  perTicket: z.boolean().default(false),
});

export const ScannerCounterSchema = z.object({
  label: z.string().trim().min(2).max(40),
  questionKey: z.string().trim().min(2).max(40),
  increment: z.number().int().min(-10).max(10).default(1),
});

/** Domande ai partecipanti: oggi bambini e attività di Zuccaland, scritti nelle note. */
export const attendeeQuestions = defineModule({
  key: 'attendee-questions',
  name: 'Domande ai partecipanti',
  description: 'Età dei bambini, intolleranze, attività scelte.',
  settingsSchema: z.object({
    questions: z.array(QuestionSchema).max(20).default([]),
    scannerCounters: z.array(ScannerCounterSchema).max(6).default([]),
  }),
  settingsLabels: {
    questions: { label: 'Domande', help: 'Mostrate nel checkout e nella pagina ordine.' },
    scannerCounters: { label: 'Pulsanti dello scanner', help: 'Es. “+1 Bambino”: aggiungono al conteggio della risposta indicata.' },
    'questions.key': { label: 'Codice', help: 'Minuscole, numeri e _ (es. bambini).' },
    'questions.label': { label: 'Domanda' },
    'questions.type': { label: 'Tipo' },
    'questions.options': { label: 'Opzioni', help: 'Solo per “choice”, separate da virgola.' },
    'questions.required': { label: 'Obbligatoria' },
    'questions.perTicket': { label: 'Una risposta per biglietto' },
    'scannerCounters.label': { label: 'Testo del pulsante' },
    'scannerCounters.questionKey': { label: 'Codice della domanda' },
    'scannerCounters.increment': { label: 'Quanto aggiunge' },
  },
  admin: { orderPanels: [{ key: 'answers', title: 'Risposte', permission: 'orders.read' }] },
  checkout: { steps: [{ key: 'questions', title: 'Partecipanti' }] },
  scanner: {
    actions: ({ settings }) => settings.scannerCounters.map((c, i) => ({ key: `counter-${i}`, label: c.label, questionKey: c.questionKey, increment: c.increment })),
  },
});
