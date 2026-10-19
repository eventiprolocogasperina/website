import { z } from 'zod';
import { defineModule } from '../types';

/** Attività gratuite incluse nel biglietto (es. Zucca in Vaso), ognuna con i suoi giorni e i suoi posti. */
export const ActivitySchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Solo minuscole, numeri e _ (es. zucca_vaso).'),
  label: z.string().trim().min(2).max(120),
  details: z.string().trim().max(300).default(''),
  /** Per chi è: i posti si contano sui bambini dell'ordine oppure su tutti gli ingressi. */
  target: z.enum(['bambini', 'tutti']).default('bambini'),
  /** Date in cui c'è l'attività; vuoto = tutte. */
  sessionIds: z.array(z.string().uuid()).default([]).meta({ widget: 'sessions' }),
  /** Posti per data; 0 = senza limite. */
  maxPlaces: z.number().int().min(0).max(10000).default(0),
});

/** Domande in più, oltre ad attività e bambini (es. intolleranze). */
export const QuestionSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{2,40}$/, 'Solo minuscole, numeri e _.'),
  label: z.string().trim().min(2).max(120),
  type: z.enum(['testo', 'numero', 'scelta']).default('testo'),
  options: z.string().trim().max(500).default(''),
  required: z.boolean().default(false),
});

export const ScannerCounterSchema = z.object({
  label: z.string().trim().min(2).max(40),
  questionKey: z.string().trim().min(2).max(40),
  increment: z.number().int().min(-10).max(10).default(1),
});

export const activitiesSettings = z.object({
  askChildren: z.boolean().default(true),
  activities: z.array(ActivitySchema).max(30).default([]),
  /** Laboratorio a pagamento da ricordare nel checkout (es. You Pick Lab). */
  labProductId: z.string().uuid().nullable().default(null).meta({ widget: 'product' }),
  remindIfMissing: z.boolean().default(true),
  questions: z.array(QuestionSchema).max(20).default([]),
  scannerCounters: z.array(ScannerCounterSchema).max(6).default([{ label: '+1 Bambino', questionKey: 'bambini', increment: 1 }]),
});
export type ActivitiesSettings = z.output<typeof activitiesSettings>;

/** Codici delle risposte salvate in attendee_answers (gli stessi della migrazione degli ordini di oggi). */
export const ANSWER_KEYS = { children: 'bambini', activities: 'attivita' } as const;

/**
 * Attività e laboratori, come a Zuccaland: quanti bambini ci sono nell'ordine, quali attività gratuite
 * sceglie (solo quelle del giorno scelto e con posti liberi), promemoria del laboratorio a pagamento.
 */
export const activities = defineModule({
  key: 'activities',
  name: 'Attività e laboratori',
  description: 'Bambini, attività gratuite per giorno con i loro posti, promemoria del laboratorio a pagamento.',
  dependsOn: ['time-slots'],
  settingsSchema: activitiesSettings,
  settingsLabels: {
    askChildren: { label: 'Chiedi quanti sono i bambini', help: 'Al massimo quanti sono gli ingressi dell’ordine.' },
    activities: { label: 'Attività gratuite', help: 'Incluse nel biglietto. Si scelgono nel checkout.' },
    'activities.key': { label: 'Codice', help: 'Minuscole, numeri e _ (es. zucca_vaso). Non cambiarlo dopo le prime vendite.' },
    'activities.label': { label: 'Nome', help: 'Es. Zucca in Vaso (3-7 anni).' },
    'activities.details': { label: 'Dettagli', help: 'Orario, a cura di…' },
    'activities.target': { label: 'Per chi' },
    'activities.sessionIds': { label: 'Giorni', help: 'Nessuno selezionato = tutti i giorni.' },
    'activities.maxPlaces': { label: 'Posti per giorno', help: '0 = senza limite.' },
    labProductId: { label: 'Laboratorio a pagamento', help: 'Ricordato nel checkout a chi non l’ha scelto.' },
    remindIfMissing: { label: 'Promemoria se mancano attività o laboratorio', help: 'Prima del pagamento, una volta sola.' },
    questions: { label: 'Altre domande', help: 'Es. intolleranze. Una risposta per ordine.' },
    'questions.key': { label: 'Codice' },
    'questions.label': { label: 'Domanda' },
    'questions.type': { label: 'Tipo' },
    'questions.options': { label: 'Opzioni', help: 'Solo per “scelta”, separate da virgola.' },
    'questions.required': { label: 'Obbligatoria' },
    scannerCounters: { label: 'Pulsanti dello scanner', help: 'Es. “+1 Bambino”: aggiungono al conteggio della risposta indicata.' },
    'scannerCounters.label': { label: 'Testo del pulsante' },
    'scannerCounters.questionKey': { label: 'Codice della risposta', help: 'bambini, o il codice di una domanda.' },
    'scannerCounters.increment': { label: 'Quanto aggiunge' },
  },
  admin: {
    nav: { label: 'Attività', icon: 'palette', permission: 'orders.read' },
    orderPanels: [{ key: 'activities', title: 'Bambini e attività', permission: 'orders.read' }],
    dashboardWidgets: [{ key: 'activities-today', title: 'Attività di oggi' }],
  },
  checkout: { steps: [{ key: 'activities', title: 'Bambini e attività' }] },
  scanner: {
    actions: ({ settings }) => settings.scannerCounters.map((c, i) => ({ key: `counter-${i}`, label: c.label, questionKey: c.questionKey, increment: c.increment })),
  },
});
