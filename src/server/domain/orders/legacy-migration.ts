// Regole della migrazione degli ordini esistenti (prompt 10). Funzioni pure, usate da
// scripts/migrate-orders.ts e testate a parte. Il testo delle note si legge con parseOrderNotes(),
// la stessa funzione che usa oggi l'admin, così nuovo e vecchio danno la stessa data.
import { parseOrderNotes } from '@/lib/data/tickets';

/** "12.50" (numeric di Postgres) → 1250. */
export function toCents(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export const LEGACY_PAYMENT_METHOD = { CONTANTI: 'cash', POS: 'card_pos', OMAGGIO: 'complimentary' } as const;
export const LEGACY_REFUND_STATUS = { pending: 'requested', approved: 'approved', refunded: 'paid', rejected: 'rejected' } as const;

/** Pezzi di nota che la migrazione sa leggere; il resto finisce nel report. */
const KNOWN_SEGMENTS = [
  /^Data:/i,
  /^Giorno:/i,
  /^Bambini:\s*\d+/i,
  /^Attività/i,
  /^\[SPOSTAMENTO DATA:[^\]]+\]$/i,
  /^\[INTEGRAZIONE[^\]]*\]:/i,
];

export type InterpretedNotes = {
  /** Giorno di Zuccaland ("24"), o null se non si capisce. */
  dayKey: string | null;
  /** Giorno scelto all'acquisto, se poi l'ordine è stato spostato o rinviato. */
  originalDayKey: string | null;
  moves: Array<{ date: string; timestamp?: string }>;
  integrations: Array<{ amountCents: number; description: string; transactionId?: string }>;
  answers: Array<{ questionKey: string; value: unknown }>;
  /** Pezzi di testo che non corrispondono a nessuna regola. */
  uninterpreted: string[];
};

export function interpretNotes(notes: string | null | undefined): InterpretedNotes {
  const empty: InterpretedNotes = { dayKey: null, originalDayKey: null, moves: [], integrations: [], answers: [], uninterpreted: [] };
  if (!notes?.trim()) return empty;
  const p = parseOrderNotes(notes);
  const answers: InterpretedNotes['answers'] = [];
  if (p.children !== null) answers.push({ questionKey: 'bambini', value: { bambini: p.children, iscritti: p.totalRegistered } });
  if (p.activities.length) answers.push({ questionKey: 'attivita', value: p.activities });
  if (p.target) answers.push({ questionKey: 'attivita_per', value: p.target });

  // Si spezza su "|" e a capo, togliendo prima i tag tra parentesi quadre che possono contenere "|".
  const tags = [...notes.matchAll(/\[SPOSTAMENTO DATA:[^\]]+\]|\[INTEGRAZIONE[^\]]*\]:[^|\n[]*/gi)].map((m) => m[0].trim());
  let rest = notes;
  for (const t of tags) rest = rest.replace(t, '|');
  const segments = [...tags, ...rest.split(/[|\n]/)].map((s) => s.trim()).filter(Boolean);
  const uninterpreted = segments.filter((s) => !KNOWN_SEGMENTS.some((r) => r.test(s)));

  return {
    dayKey: p.dayKey === 'unspecified' ? null : p.dayKey,
    originalDayKey: p.originalDayKey ?? (p.isExplicitlyMoved ? firstDayKey(notes) : null),
    moves: p.dateHistory.map((m) => ({ date: m.date, timestamp: m.timestamp })),
    integrations: p.integrations.map((i) => ({ amountCents: Math.round(i.amount * 100), description: i.description, transactionId: i.transactionId })),
    answers,
    uninterpreted,
  };
}

/** Il giorno scritto in "Data: …" prima di qualunque spostamento. */
function firstDayKey(notes: string): string | null {
  const m = notes.match(/(?:Data|Giorno):\s*[^|\d]*(\d{1,2})/i);
  return m ? m[1] : null;
}

export type LegacyTicket = { id: string; type: string; price: string; qrCodeData: string; isCheckedIn: boolean | null; checkInTime: string | null };

/** Biglietti raggruppati in righe d'ordine per tipo e prezzo. */
export function groupTickets<T extends LegacyTicket>(tickets: T[]): Array<{ type: string; unitPriceCents: number; tickets: T[] }> {
  const groups = new Map<string, { type: string; unitPriceCents: number; tickets: T[] }>();
  for (const t of tickets) {
    const unitPriceCents = toCents(t.price);
    const key = `${t.type}|${unitPriceCents}`;
    const g = groups.get(key) ?? { type: t.type, unitPriceCents, tickets: [] };
    g.tickets.push(t);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * Il prodotto a cui corrisponde un tipo di biglietto o un articolo: stesso nome; per i biglietti
 * anche l'unico biglietto dell'edizione o quello il cui nome è contenuto nel tipo
 * ("Biglietto Assaggia e Passeggia" → "Biglietto").
 */
export function matchProduct<P extends { id: string; name: string; kind: string }>(type: string, products: P[]): P | null {
  const norm = (s: string) => s.trim().toLowerCase();
  const byName = products.find((p) => norm(p.name) === norm(type));
  if (byName) return byName;
  const tickets = products.filter((p) => p.kind === 'ticket');
  if (tickets.length === 1 && products.length === 1) return tickets[0];
  return tickets.find((p) => norm(type).includes(norm(p.name))) ?? null;
}
