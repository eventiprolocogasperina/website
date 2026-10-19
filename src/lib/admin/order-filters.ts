// Filtri dell'elenco ordini (§11.1): stanno nell'URL, così si condividono e il tasto "indietro" funziona.
// Funzioni pure, usate dalla pagina (server) e dalla barra dei filtri (client).

export const ORDER_STATUSES = ['pending', 'paid', 'partially_refunded', 'refunded', 'cancelled', 'expired'] as const;
export const ORDER_CHANNEL_KEYS = ['online', 'pos', 'paylink', 'invite', 'admin'] as const;
export const ORDER_SORTS = ['-data', 'data', '-totale', 'totale', 'codice', '-codice'] as const;

export type OrderStatusKey = (typeof ORDER_STATUSES)[number];
export type OrderChannelKey = (typeof ORDER_CHANNEL_KEYS)[number];
export type OrderSort = (typeof ORDER_SORTS)[number];

export const CHANNEL_LABELS: Record<OrderChannelKey, string> = {
  online: 'Online',
  pos: 'Cassa',
  paylink: 'Pay-link',
  invite: 'Invito',
  admin: 'Admin',
};

export type OrderFilters = {
  q: string;
  /** Solo nella vista globale: slug dell'edizione. */
  edition: string;
  status: OrderStatusKey[];
  channel: OrderChannelKey[];
  session: string;
  /** Giorni "AAAA-MM-GG" (ora italiana). */
  from: string;
  to: string;
  /** "si" = con un codice sconto qualsiasi, altrimenti il codice. */
  discount: string;
  blacklist: '' | 'si' | 'no';
  refund: boolean;
  sort: OrderSort;
  /** Da 0. */
  page: number;
};

export const EMPTY_FILTERS: OrderFilters = { q: '', edition: '', status: [], channel: [], session: '', from: '', to: '', discount: '', blacklist: '', refund: false, sort: '-data', page: 0 };

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

function get(raw: Raw, key: string): string {
  const v = raw instanceof URLSearchParams ? raw.get(key) : raw[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const list = <T extends string>(value: string, allowed: readonly T[]) => [...new Set(value.split(',').filter((v): v is T => allowed.includes(v as T)))];

/** Dai parametri dell'URL ai filtri: valori sconosciuti o malformati si ignorano. */
export function parseOrderFilters(raw: Raw): OrderFilters {
  const blacklist = get(raw, 'blacklist');
  const sort = get(raw, 'ordina') as OrderSort;
  return {
    q: get(raw, 'q').slice(0, 100),
    edition: /^[a-z0-9-]{1,80}$/.test(get(raw, 'edizione')) ? get(raw, 'edizione') : '',
    status: list(get(raw, 'stato'), ORDER_STATUSES),
    channel: list(get(raw, 'canale'), ORDER_CHANNEL_KEYS),
    session: UUID.test(get(raw, 'sessione')) ? get(raw, 'sessione') : '',
    from: DAY.test(get(raw, 'dal')) ? get(raw, 'dal') : '',
    to: DAY.test(get(raw, 'al')) ? get(raw, 'al') : '',
    discount: /^[A-Za-z0-9_-]{1,40}$/.test(get(raw, 'sconto')) ? get(raw, 'sconto') : '',
    blacklist: blacklist === 'si' || blacklist === 'no' ? blacklist : '',
    refund: get(raw, 'rimborso') === 'si',
    sort: ORDER_SORTS.includes(sort) ? sort : '-data',
    page: Math.max(0, (Number.parseInt(get(raw, 'pagina'), 10) || 1) - 1),
  };
}

/** Dai filtri alla query string, con le chiavi in un ordine fisso (serve a riconoscere le viste). */
export function orderFiltersToQuery(f: Partial<OrderFilters>, opts: { page?: boolean } = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.edition) p.set('edizione', f.edition);
  if (f.status?.length) p.set('stato', [...f.status].sort().join(','));
  if (f.channel?.length) p.set('canale', [...f.channel].sort().join(','));
  if (f.session) p.set('sessione', f.session);
  if (f.from) p.set('dal', f.from);
  if (f.to) p.set('al', f.to);
  if (f.discount) p.set('sconto', f.discount);
  if (f.blacklist) p.set('blacklist', f.blacklist);
  if (f.refund) p.set('rimborso', 'si');
  if (f.sort && f.sort !== '-data') p.set('ordina', f.sort);
  if (opts.page !== false && f.page) p.set('pagina', String(f.page + 1));
  return p.toString();
}

/** Query della vista: i filtri senza pagina né ricerca libera. */
export function viewQuery(f: OrderFilters): string {
  return orderFiltersToQuery({ ...f, q: '', page: 0 }, { page: false });
}

export type OrderView = { key: string; name: string; query: string };

/** Viste predefinite (§11.1): tab fissi, uguali per tutti. Quelle degli utenti stanno nel database. */
export const DEFAULT_ORDER_VIEWS: OrderView[] = [
  { key: 'tutti', name: 'Tutti', query: '' },
  { key: 'da-pagare', name: 'Da pagare', query: 'stato=pending' },
  { key: 'pagati', name: 'Pagati', query: 'stato=paid' },
  { key: 'rimborsati', name: 'Rimborsati', query: 'stato=partially_refunded%2Crefunded' },
  { key: 'blacklist', name: 'Blacklist', query: 'blacklist=si' },
];

/** La vista che corrisponde ai filtri attuali, se c'è. */
export function activeView(f: OrderFilters, views: OrderView[]): OrderView | null {
  const q = viewQuery(f);
  return views.find((v) => new URLSearchParams(v.query).toString() === q) ?? null;
}

/** Quanti filtri sono attivi, esclusi ricerca e ordinamento. */
export function countActiveFilters(f: OrderFilters): number {
  return [f.edition, f.status.length, f.channel.length, f.session, f.from || f.to, f.discount, f.blacklist, f.refund].filter(Boolean).length;
}
