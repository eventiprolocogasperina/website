// Regole del check-in senza database: date rinviate, prodotti delle liste, contatori delle azioni
// dello scanner, fasce di un quarto d'ora. Le usano i servizi, le pagine e i test.

export type SessionNode = { id: string; label: string; status: string; rescheduledToSessionId: string | null };
export type SessionGraph = Map<string, SessionNode>;

export function sessionGraph(rows: SessionNode[]): SessionGraph {
  return new Map(rows.map((s) => [s.id, s]));
}

/**
 * Data in cui un biglietto vale davvero: quella del biglietto o, se è stata rinviata, la data di
 * recupero (anche dopo più rinvii). Dopo un rinvio gli ordini vengono spostati, ma un biglietto
 * rimasto sulla data rinviata deve entrare lo stesso alla data di recupero.
 */
export function effectiveSession(graph: SessionGraph, sessionId: string | null): string | null {
  let id = sessionId;
  for (let hops = 0; id && hops < 10; hops++) {
    const node = graph.get(id);
    if (!node || node.status !== 'postponed' || !node.rescheduledToSessionId) return id;
    id = node.rescheduledToSessionId;
  }
  return id;
}

/** Il biglietto vale per la data che si sta controllando? Senza data (dell'uno o dell'altro) vale sempre. */
export function sessionMatches(graph: SessionGraph, ticketSessionId: string | null, targetSessionId: string | null): boolean {
  if (!targetSessionId || !ticketSessionId) return true;
  return ticketSessionId === targetSessionId || effectiveSession(graph, ticketSessionId) === targetSessionId;
}

/** Una lista senza prodotti accetta tutti i biglietti dell'edizione. */
export function listAcceptsProduct(list: { productIds: string[] }, productId: string): boolean {
  return list.productIds.length === 0 || list.productIds.includes(productId);
}

export type AnswerChange = { ok: true; stored: unknown; before: number; after: number } | { ok: false; error: string };

/**
 * Applica "+1" (o un altro incremento) a una risposta numerica. Le risposte migrate dal sistema di
 * oggi sono oggetti ({ bambini: 2, iscritti: 4 }): si aggiorna la proprietà con il codice della
 * domanda e si lasciano le altre.
 */
export function incrementAnswer(value: unknown, questionKey: string, increment: number): AnswerChange {
  const apply = (before: number) => {
    const after = before + increment;
    return after < 0 ? null : { before, after };
  };
  const negative = { ok: false as const, error: 'Il conteggio non può scendere sotto zero.' };
  if (value === null || value === undefined) {
    const r = apply(0);
    return r ? { ok: true, stored: r.after, ...r } : negative;
  }
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
    const r = apply(Number(value));
    return r ? { ok: true, stored: r.after, ...r } : negative;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const inner = (value as Record<string, unknown>)[questionKey];
    const current = inner === undefined || inner === null ? 0 : Number(inner);
    if (!Number.isFinite(current)) return { ok: false, error: 'La risposta salvata non è un numero.' };
    const r = apply(current);
    return r ? { ok: true, stored: { ...(value as Record<string, unknown>), [questionKey]: r.after }, ...r } : negative;
  }
  return { ok: false, error: 'La risposta salvata non è un numero.' };
}

/** Valore numerico di una risposta, nei due formati (numero o oggetto della migrazione). */
export function answerCount(value: unknown, questionKey: string): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const inner = Number((value as Record<string, unknown>)[questionKey]);
    return Number.isFinite(inner) ? inner : null;
  }
  return null;
}

/** Orario di un passaggio registrato offline: quello del telefono, se plausibile (ultime 24 ore). */
export function offlineScanTime(at: Date | null | undefined, now: Date): Date {
  if (!at || Number.isNaN(at.getTime())) return now;
  const age = now.getTime() - at.getTime();
  return age < -5 * 60_000 || age > 24 * 3600_000 ? now : at;
}

const QUARTER = 15 * 60_000;

/** Ingressi per quarto d'ora, con le fasce vuote in mezzo: [{ start, count }]. */
export function quarterHours(rows: Array<{ start: Date; count: number }>): Array<{ start: Date; count: number }> {
  if (!rows.length) return [];
  const byStart = new Map(rows.map((r) => [Math.floor(r.start.getTime() / QUARTER) * QUARTER, r.count]));
  const keys = [...byStart.keys()].sort((a, b) => a - b);
  const out: Array<{ start: Date; count: number }> = [];
  for (let t = keys[0]; t <= keys[keys.length - 1]; t += QUARTER) out.push({ start: new Date(t), count: byStart.get(t) ?? 0 });
  return out;
}
