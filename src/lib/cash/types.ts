// Forme JSON delle API /api/cassa/*, per l'app del telefono (che non importa codice del server, §4).

export type PrinterSettings = {
  ticketWidthMm: number;
  charactersPerLine: number;
  autoPrintOnOrder: boolean;
  printCustomerReceipt: boolean;
  printDepartmentSlips: boolean;
  headerTitle?: string;
  footerText?: string;
  showQrCode: boolean;
  autoCutPaper: boolean;
};

export type PosProduct = {
  id: string;
  name: string;
  icon: string | null;
  kind: string;
  priceCents: number;
  group: string;
  department: string | null;
  remaining: number | null;
  active: boolean;
};

export type PosCatalog = {
  edition: { id: string; slug: string; title: string; status: string; departments: boolean };
  register: { id: string; name: string; issuesNumbers: boolean; printer: PrinterSettings };
  products: PosProduct[];
  version: string;
};

export type PayMethod = 'cash' | 'card_pos' | 'complimentary';

export type SaleLine = { productId: string; name: string; quantity: number; unitPriceCents: number; totalCents: number; department: string | null };

export type Sale = {
  orderId: string;
  code: string;
  number: number | null;
  totalCents: number;
  method: PayMethod;
  cashReceivedCents: number | null;
  changeCents: number | null;
  complimentaryReason: string | null;
  registerName: string;
  lines: SaleLine[];
  at: string;
  created: boolean;
  oversold: boolean;
  afterClose: boolean;
  /** Solo sul telefono: vendita salvata in coda, non ancora sul server. */
  queued?: boolean;
};

export type CassaState = {
  edition: { slug: string; title: string; status: string; departments: boolean };
  user: { id: string; name: string } | null;
  device: { name: string } | null;
  canClose: boolean;
  registers: Array<{ id: string; name: string; openSession: { id: string; openedAt: string; openingFloatCents: number } | null }>;
  departments: string[];
  managers: Array<{ id: string; name: string }>;
};

export type RecentSale = { orderId: string; code: string; number: number | null; totalCents: number; at: string; voided: boolean; summary: string };

export type MethodTotal = { method: PayMethod; label: string; count: number; amountCents: number; refundedCents: number; netCents: number };

export type SessionInfo = {
  id: string;
  registerName: string;
  openedAt: string;
  openedByName: string | null;
  closedAt: string | null;
  openingFloatCents: number;
  expectedCashCents: number;
  zReportNumber: number | null;
  totals: { sales: number; voided: number; flagged: number; netCents: number; complimentaryCents: number; byMethod: MethodTotal[] };
};

export const METHOD_LABEL: Record<PayMethod, string> = { cash: 'Contanti', card_pos: 'Carta (POS)', complimentary: 'Omaggio' };

/** Errore di un'API della cassa: messaggio in italiano e codice (SOLD_OUT, PRICE_CHANGED…). */
export class CassaError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

/** fetch verso /api/cassa con errori leggibili. status null = rete assente. */
export async function cassaFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  } catch {
    throw new CassaError('Connessione assente.', 'NETWORK', null);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new CassaError(body.error ?? 'Si è verificato un errore. Riprova.', body.code ?? 'INTERNAL', res.status);
  return body as T;
}
