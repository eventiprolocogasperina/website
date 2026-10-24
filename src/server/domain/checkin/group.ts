import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction } from '@/server/db/client';
import { ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { insertCheckin, judge, loadRows, openList, ScanInput, type Judged, type ScannedTicket, type ScanResult } from './scan';

// Ingresso di gruppo: il QR (quello al centro dell'email o uno qualsiasi del PDF) apre tutto
// l'ordine. L'operatore vede i biglietti che possono entrare, toglie chi non c'è e conferma una volta
// sola: un passaggio per biglietto, nella stessa transazione, ciascuno con la sua voce nel registro.

/** Stato di un biglietto dell'ordine nell'elenco da confermare. `ready` = può entrare adesso. */
export type OrderTicketState = 'ready' | 'already_used' | 'wrong_session' | 'wrong_list' | 'void';
export type OrderTicket = ScannedTicket & { state: OrderTicketState; at?: Date; by?: string | null; checkinId?: string };

/**
 * Esito della lettura di un QR. `order`: almeno un biglietto dell'ordine può entrare, si chiede la
 * conferma (`ticket` è quello letto). Altrimenti l'esito del biglietto letto, come una scansione:
 * blacklist, "Da pagare" e QR sconosciuto valgono per tutto l'ordine; "già entrato", "altra data"…
 * si mostrano così quando nessun altro biglietto dell'ordine può entrare.
 */
export type OrderPreview = ScanResult | { result: 'order'; ticket: ScannedTicket; tickets: OrderTicket[] };

function toOrderTicket(j: Judged): OrderTicket | null {
  if ('ready' in j) return { ...j.ready.ticket, state: 'ready' };
  const r = j.final;
  if (r.result === 'already_used') return { ...r.ticket, state: 'already_used', at: r.at, by: r.by, checkinId: r.checkinId };
  if (r.result === 'wrong_session' || r.result === 'wrong_list' || r.result === 'void') return { ...r.ticket, state: r.result };
  return null;
}

/**
 * Lettura di un QR senza registrare niente: tutti i biglietti dello stesso ordine, ciascuno con il
 * suo stato per questa lista e questa data. Una sola query per i biglietti (sottoquery sul QR letto).
 */
export async function previewOrder(ctx: Ctx, input: z.input<typeof ScanInput>): Promise<OrderPreview> {
  const data = ScanInput.parse(input);
  const db = getDb();
  const scope = await openList(db, ctx, data.checkinListId, null);
  const scanned = alias(ticketsV2, 'scanned');
  const orderOf = db
    .select({ orderId: scanned.orderId })
    .from(scanned)
    .where(data.ticketId ? eq(scanned.id, data.ticketId) : eq(scanned.qrToken, data.qrToken!));
  const rows = await loadRows(db, inArray(ticketsV2.orderId, orderOf), null);
  const index = rows.findIndex((r) => (data.ticketId ? r.ticket.id === data.ticketId : r.ticket.qrToken === data.qrToken));
  if (index < 0) return { result: 'unknown' };
  const judged = await judge(db, scope, rows, data.sessionId ?? null, () => undefined);
  const own = judged[index];
  if ('final' in own && (own.final.result === 'unknown' || own.final.result === 'blocked' || own.final.result === 'to_pay')) return own.final;
  const tickets = judged.map(toOrderTicket).filter((t): t is OrderTicket => !!t);
  if (!tickets.some((t) => t.state === 'ready')) return 'final' in own ? own.final : { result: 'unknown' };
  const ticket = 'ready' in own ? own.ready.ticket : (own.final as { ticket: ScannedTicket }).ticket;
  return { result: 'order', ticket, tickets };
}

export const GroupCheckinInput = z
  .object({
    checkinListId: z.string().uuid(),
    sessionId: z.string().uuid().nullish(),
    items: z
      .array(z.object({ ticketId: z.string().uuid(), clientId: z.string().trim().min(8).max(80).nullish() }))
      .min(1)
      .max(50),
  })
  .refine((d) => new Set(d.items.map((i) => i.ticketId)).size === d.items.length, { message: 'Biglietto ripetuto.' });

export type GroupCheckinResult = {
  result: 'entered';
  /** Il primo biglietto confermato: ordine, codice e nome per l'esito e per i pulsanti dei moduli. */
  ticket: ScannedTicket;
  entered: Array<{ ticketId: string; checkinId: string; at: Date }>;
  /** Biglietti scelti che nel frattempo non potevano più entrare (es. entrati da un altro telefono). */
  skipped: Array<{ ticketId: string; result: ScanResult['result']; at?: Date; by?: string | null }>;
  tickets: ScannedTicket[];
};

export type GroupCheckinOptions = { now?: Date };

/**
 * "Fai entrare N": un passaggio per ogni biglietto scelto, tutti nella stessa transazione. I biglietti
 * sono bloccati (FOR UPDATE, sempre nello stesso ordine) e ricontrollati con le regole della
 * scansione: chi nel frattempo è entrato da un altro telefono resta fuori e torna in `skipped`.
 * Il `clientId` per biglietto rende innocuo un reinvio dopo una rete che cade.
 */
export async function checkinGroup(ctx: Ctx, input: z.input<typeof GroupCheckinInput>, opts: GroupCheckinOptions = {}): Promise<GroupCheckinResult> {
  const data = GroupCheckinInput.parse(input);
  const now = opts.now ?? new Date();
  const clientOf = new Map(data.items.filter((i) => i.clientId).map((i) => [i.ticketId, i.clientId!]));
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx): Promise<GroupCheckinResult> => {
    const scope = await openList(tx, ctx, data.checkinListId, tx);
    const rows = await loadRows(
      tx,
      inArray(
        ticketsV2.id,
        data.items.map((i) => i.ticketId),
      ),
      tx,
    );
    if (rows.length !== data.items.length) throw new DomainError('NOT_FOUND');
    if (new Set(rows.map((r) => r.ticket.orderId)).size > 1) throw new DomainError('VALIDATION', { message: 'I biglietti da far entrare insieme devono essere dello stesso ordine.' });
    const judged = await judge(tx, scope, rows, data.sessionId ?? null, (id) => clientOf.get(id));
    const tickets: ScannedTicket[] = [];
    const entered: GroupCheckinResult['entered'] = [];
    const skipped: GroupCheckinResult['skipped'] = [];
    for (const j of judged) {
      if ('ready' in j) {
        const c = await insertCheckin(tx, ctx, j.ready, now, clientOf.get(j.ready.ticketId) ?? null, events, { group: data.items.length });
        tickets.push(j.ready.ticket);
        entered.push({ ticketId: j.ready.ticketId, checkinId: c.id, at: c.at });
        continue;
      }
      const r = j.final;
      if (r.result === 'unknown') throw new DomainError('NOT_FOUND');
      tickets.push(r.ticket);
      // Stesso clientId già registrato: è un reinvio, il biglietto risulta entrato.
      if (r.result === 'valid') entered.push({ ticketId: r.ticket.id, checkinId: r.checkinId, at: r.at });
      else skipped.push({ ticketId: r.ticket.id, result: r.result, ...(r.result === 'already_used' ? { at: r.at, by: r.by } : {}) });
    }
    const first = entered.length ? tickets.find((t) => t.id === entered[0].ticketId)! : tickets[0];
    return { result: 'entered', ticket: first, entered, skipped, tickets };
  });
  await publish(events);
  return result;
}
