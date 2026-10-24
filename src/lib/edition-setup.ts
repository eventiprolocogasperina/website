// Checklist "Da completare" di un'edizione e procedura guidata "Nuova edizione". Funzioni pure.
// Lo stato di ogni passo si calcola dai dati (date, catalogo, pagina, casse…): l'unica scelta salvata
// è "saltato per ora", in editions.module_settings._setup (chiave che non è un modulo, nessuna migrazione).
import { formatMoney } from '@/lib/money';
import type { EditionStatus } from '@/server/domain/editions/types';

/** Tipo di edizione scelto nella procedura: con vendite (biglietti, cassa) o solo pagina informativa. */
export type SetupKind = 'sales' | 'info';

/** Passi, nell'ordine in cui si fanno. */
export const SETUP_STEPS = ['dates', 'tickets', 'extras', 'page', 'rules', 'registers', 'discounts', 'publish'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Segmento dell'URL della procedura: /admin/e/<edizione>/procedura/<segmento>. */
export const STEP_PATHS: Record<SetupStep, string> = {
  dates: 'date',
  tickets: 'biglietti',
  extras: 'extra',
  page: 'pagina',
  rules: 'regolamento',
  registers: 'casse',
  discounts: 'sconti',
  publish: 'pubblica',
};

/** Sezione dell'admin dell'edizione dove lo stesso lavoro si fa per esteso. */
export const STEP_ADMIN_PATHS: Record<SetupStep, string> = {
  dates: 'date',
  tickets: 'catalogo',
  extras: 'catalogo',
  page: 'pagina',
  rules: 'pagina',
  registers: 'cassa',
  discounts: 'catalogo',
  publish: 'impostazioni',
};

/** Passi necessari per aprire le vendite (il server li ricontrolla in changeEditionStatus). */
export const SALES_REQUIRED: readonly SetupStep[] = ['dates', 'tickets', 'page', 'rules'];

/** Chiave in editions.module_settings dove vive lo stato della procedura. */
export const SETUP_SETTINGS_KEY = '_setup';

export type SetupState = { kind: SetupKind | null; skipped: SetupStep[] };

const isStep = (v: unknown): v is SetupStep => typeof v === 'string' && (SETUP_STEPS as readonly string[]).includes(v);

/** Legge lo stato salvato della procedura, ignorando i valori non validi. */
export function readSetupState(moduleSettings: Record<string, unknown> | null | undefined): SetupState {
  const raw = moduleSettings?.[SETUP_SETTINGS_KEY];
  if (!raw || typeof raw !== 'object') return { kind: null, skipped: [] };
  const r = raw as { kind?: unknown; skipped?: unknown };
  return {
    kind: r.kind === 'sales' || r.kind === 'info' ? r.kind : null,
    skipped: Array.isArray(r.skipped) ? [...new Set(r.skipped.filter(isStep))] : [],
  };
}

/** I fatti dell'edizione che servono alla checklist, letti dal database da setup.ts. */
export type SetupFacts = {
  kind: SetupKind;
  status: EditionStatus;
  location: string | null;
  startsAt: Date | null;
  subtitle: string | null;
  publicPageMode: 'generic' | 'landing';
  sessions: Array<{ status: string; capacity: number | null }>;
  products: Array<{ kind: string; active: boolean; channels: string[]; priceCents: number; openPrice: boolean }>;
  /** Attività del modulo "Attività e laboratori" (0 se il modulo è spento). */
  activities: number;
  /** Blocchi visibili salvati nella pagina dell'edizione (0 = pagina mai salvata). */
  visibleBlocks: number;
  rulesUrl: string | null;
  /** Casse attive. */
  registers: number;
  discounts: number;
  /** Ordini con canale "invite". */
  invites: number;
  skipped: SetupStep[];
};

export type SetupItemStatus = 'done' | 'todo' | 'skipped';

export type SetupItem = {
  key: SetupStep;
  label: string;
  /** A cosa serve il passo, in una riga. */
  description: string;
  required: boolean;
  status: SetupItemStatus;
  /** Cosa c'è o cosa manca, in una riga ("2 date senza capienza"). */
  detail: string;
  /** Segmento della procedura guidata. */
  path: string;
  /** Sezione dell'admin dell'edizione. */
  adminPath: string;
};

export type SetupChecklist = {
  kind: SetupKind;
  items: SetupItem[];
  done: number;
  total: number;
  /** Passi necessari alle vendite ancora da fare (anche se saltati). */
  salesBlockers: SetupItem[];
};

const SOLD_STATES: readonly EditionStatus[] = ['on_sale', 'sold_out', 'live', 'concluded', 'archived'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sellsOnline = (p: SetupFacts['products'][number]) => p.active && !p.openPrice && p.channels.includes('online');

type Eval = { done: boolean; detail: string };

const LABELS: Record<SetupStep, { label: string; description: string }> = {
  dates: { label: 'Date e luogo', description: 'Quando e dove, e quanti posti per ogni data (dal piano di sicurezza).' },
  tickets: { label: 'Biglietti e prezzi', description: 'Il biglietto d’ingresso che si compra online, con il suo prezzo.' },
  extras: { label: 'Extra e attività', description: 'Laboratori, degustazioni e attività per giorno, se l’evento li ha.' },
  page: { label: 'Pagina e grafica', description: 'La pagina pubblica: testi, programma, foto, colori del format.' },
  rules: { label: 'Regolamento', description: 'Foto, comportamento, partecipazione e rinvii: chi compra lo accetta.' },
  registers: { label: 'Casse', description: 'Le casse del giorno dell’evento e cosa vende ognuna.' },
  discounts: { label: 'Codici sconto e inviti', description: 'Codici per gli sponsor e biglietti omaggio per enti e sponsor.' },
  publish: { label: 'Pubblica e apri le vendite', description: 'Prima la pagina diventa visibile, poi si aprono le vendite.' },
};

function evalDates(f: SetupFacts): Eval {
  if (f.kind === 'info') {
    const missing = [!f.startsAt && 'la data', !f.location && 'il luogo'].filter(Boolean);
    return missing.length ? { done: false, detail: `Manca ${missing.join(' e ')}` } : { done: true, detail: f.location! };
  }
  const live = f.sessions.filter((s) => s.status !== 'cancelled');
  if (!live.length) return { done: false, detail: 'Aggiungi almeno una data' };
  const noCapacity = live.filter((s) => s.capacity === null).length;
  if (noCapacity) return { done: false, detail: `${plural(noCapacity, 'data', 'date')} senza capienza` };
  if (!f.location) return { done: false, detail: 'Manca il luogo' };
  const places = live.reduce((n, s) => n + (s.capacity ?? 0), 0);
  return { done: true, detail: `${plural(live.length, 'data', 'date')} · ${places} posti · ${f.location}` };
}

function evalTickets(f: SetupFacts): Eval {
  const tickets = f.products.filter((p) => p.kind === 'ticket' && sellsOnline(p));
  if (!tickets.length) return { done: false, detail: 'Nessun biglietto in vendita online' };
  const min = Math.min(...tickets.map((p) => p.priceCents));
  return { done: true, detail: `${plural(tickets.length, 'biglietto', 'biglietti')}, da ${formatMoney(min)}` };
}

function evalExtras(f: SetupFacts): Eval {
  const extras = f.products.filter((p) => p.kind !== 'ticket' && sellsOnline(p)).length;
  if (!extras && !f.activities) return { done: false, detail: 'Facoltativo: nessun extra o attività' };
  return { done: true, detail: [extras && plural(extras, 'extra', 'extra'), f.activities && plural(f.activities, 'attività', 'attività')].filter(Boolean).join(' · ') };
}

function evalPage(f: SetupFacts): Eval {
  if (f.visibleBlocks > 0) return { done: true, detail: `${plural(f.visibleBlocks, 'blocco', 'blocchi')} nella pagina` };
  if (f.publicPageMode === 'generic' && f.subtitle) return { done: true, detail: 'Scheda nel calendario con la descrizione' };
  return f.publicPageMode === 'landing'
    ? { done: false, detail: 'La pagina non è ancora stata salvata' }
    : { done: false, detail: 'Manca la descrizione dell’evento' };
}

function evalPublish(f: SetupFacts): Eval {
  if (f.kind === 'info') return f.status === 'draft' ? { done: false, detail: 'Ancora in bozza' } : { done: true, detail: 'Pubblicata' };
  if (SOLD_STATES.includes(f.status)) return { done: true, detail: 'Vendite aperte' };
  if (f.status === 'published') return { done: false, detail: 'Pubblicata: le vendite sono ancora chiuse' };
  if (f.status === 'suspended') return { done: false, detail: 'Edizione sospesa' };
  return { done: false, detail: 'Ancora in bozza' };
}

const EVALUATORS: Record<SetupStep, (f: SetupFacts) => Eval> = {
  dates: evalDates,
  tickets: evalTickets,
  extras: evalExtras,
  page: evalPage,
  rules: (f) => (f.rulesUrl ? { done: true, detail: 'Collegato alla pagina e al checkout' } : { done: false, detail: 'Manca il link al regolamento' }),
  registers: (f) => (f.registers ? { done: true, detail: plural(f.registers, 'cassa attiva', 'casse attive') } : { done: false, detail: 'Serve per vendere all’ingresso il giorno dell’evento' }),
  discounts: (f) =>
    f.discounts || f.invites
      ? { done: true, detail: [f.discounts && plural(f.discounts, 'codice', 'codici'), f.invites && plural(f.invites, 'invito', 'inviti')].filter(Boolean).join(' · ') }
      : { done: false, detail: 'Facoltativo: nessun codice o invito' },
  publish: evalPublish,
};

/** Passi mostrati per tipo: un evento solo informativo non ha biglietti, cassa né regolamento. */
export function stepsFor(kind: SetupKind): SetupStep[] {
  return kind === 'info' ? ['dates', 'page', 'publish'] : [...SETUP_STEPS];
}

function itemFor(key: SetupStep, f: SetupFacts): SetupItem {
  const { done, detail } = EVALUATORS[key](f);
  // Un evento informativo ha solo passi necessari; con le vendite lo sono quelli delle vendite più la pubblicazione.
  const required = f.kind === 'info' || SALES_REQUIRED.includes(key) || key === 'publish';
  const skippable = key !== 'publish';
  return {
    key,
    ...LABELS[key],
    ...(f.kind === 'info' && key === 'publish' ? { label: 'Pubblica', description: 'La pagina diventa visibile sul sito.' } : {}),
    ...(f.kind === 'info' && key === 'dates' ? { description: 'Quando e dove si svolge l’evento.' } : {}),
    required,
    status: done ? 'done' : skippable && f.skipped.includes(key) ? 'skipped' : 'todo',
    detail,
    path: STEP_PATHS[key],
    adminPath: STEP_ADMIN_PATHS[key],
  };
}

/** Checklist ordinata dell'edizione. */
export function computeSetupChecklist(f: SetupFacts): SetupChecklist {
  const items = stepsFor(f.kind).map((k) => itemFor(k, f));
  // Le vendite richiedono sempre i passi delle vendite, qualunque sia il tipo scelto.
  const sales = f.kind === 'sales' ? items : SETUP_STEPS.map((k) => itemFor(k, { ...f, kind: 'sales' }));
  return {
    kind: f.kind,
    items,
    done: items.filter((i) => i.status === 'done').length,
    total: items.length,
    salesBlockers: sales.filter((i) => SALES_REQUIRED.includes(i.key) && i.status !== 'done'),
  };
}

/** Messaggio dell'errore quando si prova ad aprire le vendite troppo presto. */
export function salesBlockedMessage(blockers: Pick<SetupItem, 'label' | 'detail'>[]): string {
  return `Prima di aprire le vendite completa: ${blockers.map((b) => `${b.label} (${b.detail.charAt(0).toLowerCase()}${b.detail.slice(1)})`).join('; ')}.`;
}

/** Passaggi di stato che aprono le vendite e quindi richiedono la checklist (non la riapertura automatica da "esaurita"). */
export function opensSales(from: EditionStatus, to: EditionStatus): boolean {
  return to === 'on_sale' && (from === 'published' || from === 'suspended');
}

/** "Zuccaland 2027" → "zuccaland-2027": proposta di slug dal titolo, nella procedura. */
export function slugFromTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/** Primo passo da fare (né fatto né saltato), altrimenti il primo non fatto, altrimenti l'ultimo. */
export function firstOpenStep(list: SetupChecklist): SetupItem {
  return list.items.find((i) => i.status === 'todo') ?? list.items.find((i) => i.status !== 'done') ?? list.items[list.items.length - 1];
}
