// Modelli email predefiniti (prompt 18): valgono finché un admin non li sostituisce, per tutte le
// edizioni o per una sola. Il testo della conferma è quello dell'email del checkout nuovo (prompt 13);
// rinvio e ringraziamento riprendono i documenti di oggi in src/lib/tickets/*EmailDocument.tsx, che
// restano invariati per le email del flusso di oggi di Zuccaland.

export const TEMPLATE_KEYS = ['confirmation', 'postponement', 'thank_you', 'paylink', 'refund_update', 'notify_me'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const VARIABLES = {
  'cliente.nome': { label: 'Nome del cliente', example: 'Maria' },
  'ordine.codice': { label: 'Codice ordine', example: 'ZK26-7F3K' },
  'ordine.totale': { label: 'Totale dell’ordine', example: '15,00 €' },
  'ordine.link': { label: 'Link “I miei biglietti”', example: 'https://prolocogasperina.it/i-miei-biglietti/…' },
  'sessione.data': { label: 'Data scelta', example: 'sabato 24 ottobre 2026, 15:00' },
  'edizione.titolo': { label: 'Titolo dell’edizione', example: 'Zuccaland 2026' },
  'edizione.luogo': { label: 'Luogo', example: 'Gasperina (CZ)' },
  'rinvio.nuova_data': { label: 'Nuova data dopo il rinvio', example: 'sabato 31 ottobre 2026, 15:00' },
  'pagamento.link': { label: 'Link per pagare', example: 'https://prolocogasperina.it/paga/…' },
  'rimborso.importo': { label: 'Importo del rimborso', example: '10,00 €' },
  'rimborso.stato': { label: 'Stato del rimborso', example: 'approvato' },
  'avviso.link': { label: 'Link per comprare', example: 'https://prolocogasperina.it/acquista/…' },
} as const;

export type VariableKey = keyof typeof VARIABLES;
export type TemplateVars = Partial<Record<VariableKey, string>>;

export type TemplateDef = {
  label: string;
  /** Quando parte. */
  when: string;
  subject: string;
  /** Testo con paragrafi separati da una riga vuota, **grassetto** e {{variabili}}. */
  body: string;
  variables: VariableKey[];
  /** Pulsante sotto il testo: etichetta e variabile con il link. */
  button?: { label: string; href: VariableKey };
  /** Il flusso che la usa esiste già nel sistema nuovo. */
  wired: boolean;
};

const COMMON: VariableKey[] = ['cliente.nome', 'ordine.codice', 'edizione.titolo', 'edizione.luogo', 'sessione.data'];

export const TEMPLATE_DEFAULTS: Record<TemplateKey, TemplateDef> = {
  confirmation: {
    label: 'Conferma ordine',
    when: 'Quando un ordine online o con link di pagamento è pagato, e quando lo staff reinvia i biglietti.',
    subject: 'Biglietti {{edizione.titolo}} · ordine {{ordine.codice}}',
    body: 'Ciao {{cliente.nome}}, grazie! Il tuo ordine è confermato. I biglietti sono nel PDF allegato e sempre disponibili su “I miei biglietti”.',
    variables: [...COMMON, 'ordine.totale', 'ordine.link'],
    wired: true,
  },
  postponement: {
    label: 'Rinvio',
    when: 'Quando la data di un ordine cambia per un rinvio (modulo Rinvio per maltempo).',
    subject: '{{edizione.titolo}}: nuova data per l’ordine {{ordine.codice}}',
    body:
      'Ciao {{cliente.nome}}, a causa delle condizioni meteo la giornata del {{sessione.data}} è rinviata.\n\n' +
      'Il tuo ordine **{{ordine.codice}}** passa a **{{rinvio.nuova_data}}**. I biglietti e le attività che hai già restano validi per la nuova data: non devi fare nulla.\n\n' +
      'Se la nuova data non ti va bene, rispondi a questa email: troviamo insieme una soluzione.',
    variables: [...COMMON, 'rinvio.nuova_data', 'ordine.link'],
    button: { label: 'Apri i miei biglietti', href: 'ordine.link' },
    wired: true,
  },
  thank_you: {
    label: 'Ringraziamento',
    when: 'Dopo l’evento, a chi ha partecipato.',
    subject: 'Grazie per essere stato a {{edizione.titolo}}!',
    body:
      'Ciao {{cliente.nome}}, grazie per aver partecipato a {{edizione.titolo}}!\n\n' +
      'Speriamo che ti sia divertito. Se ti va, raccontaci com’è andata: ci aiuta a fare ancora meglio la prossima volta.\n\n' +
      'Un caro saluto,\nil team della Pro Loco Gasperina',
    variables: COMMON,
    wired: false,
  },
  paylink: {
    label: 'Link di pagamento',
    when: 'Quando lo staff crea un ordine da pagare con un link.',
    subject: 'Completa il pagamento per {{edizione.titolo}} (ordine {{ordine.codice}})',
    body: 'Ciao {{cliente.nome}}, abbiamo preparato il tuo ordine **{{ordine.codice}}** per {{edizione.titolo}}: totale {{ordine.totale}}.\n\nPaga con carta dal link qui sotto. I biglietti arrivano per email appena il pagamento va a buon fine.',
    variables: [...COMMON, 'ordine.totale', 'pagamento.link'],
    button: { label: 'Paga ora', href: 'pagamento.link' },
    wired: false,
  },
  refund_update: {
    label: 'Aggiornamento rimborso',
    when: 'Quando un rimborso viene approvato, pagato o rifiutato.',
    subject: 'Il tuo rimborso per l’ordine {{ordine.codice}}',
    body: 'Ciao {{cliente.nome}}, il rimborso di {{rimborso.importo}} per l’ordine **{{ordine.codice}}** ({{edizione.titolo}}) è **{{rimborso.stato}}**.\n\nPer qualsiasi domanda rispondi a questa email indicando il codice ordine.',
    variables: [...COMMON, 'rimborso.importo', 'rimborso.stato'],
    wired: false,
  },
  notify_me: {
    label: '“Avvisami”',
    when: 'Quando si aprono le vendite di un’edizione, a chi ha chiesto di essere avvisato.',
    subject: 'Sono aperte le vendite per {{edizione.titolo}}',
    body: 'Ciao, ci avevi chiesto di avvisarti: le vendite per **{{edizione.titolo}}** sono aperte!\n\nI posti sono limitati, prenota dal link qui sotto.',
    variables: ['edizione.titolo', 'edizione.luogo', 'avviso.link'],
    button: { label: 'Prenota ora', href: 'avviso.link' },
    wired: false,
  },
};

export const isTemplateKey = (k: string): k is TemplateKey => (TEMPLATE_KEYS as readonly string[]).includes(k);
