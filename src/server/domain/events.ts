// Eventi di dominio (§6): i servizi li raccolgono durante la transazione e li pubblicano solo dopo il
// commit, così un handler non vede mai una modifica poi annullata. I moduli e le notifiche si
// iscrivono qui invece di essere chiamati dai servizi. Nei payload solo ID e codici, mai dati personali.
import type { EditionStatus } from '@/server/domain/editions/types';
import { log } from '@/server/log';

export type DomainEvent =
  | { type: 'order.created'; orderId: string; code: string; edition: string; status: string }
  | { type: 'order.paid'; orderId: string; code: string; edition: string; totalCents: number }
  | { type: 'order.paid_after_expiry'; orderId: string; code: string; edition: string; amountCents: number }
  | { type: 'order.cancelled'; orderId: string; code: string; edition: string }
  | { type: 'order.expired'; orderId: string; code: string; edition: string }
  | { type: 'order.refunded'; orderId: string; code: string; edition: string; amountCents: number; fully: boolean }
  | { type: 'order.tickets_resent'; orderId: string; code: string; edition: string }
  | { type: 'order.session_moved'; orderId: string; code: string; edition: string; fromSessionId: string | null; toSessionId: string }
  | { type: 'refund.requested'; refundId: string; orderId: string; code: string; edition: string; amountCents: number }
  | { type: 'ticket.checked_in'; ticketId: string; checkinListId: string; edition: string }
  | { type: EditionEventType; editionId: string; edition: string; from: EditionStatus; automatic: boolean };

/** Un evento per ogni stato d'arrivo (§9): edition.published, edition.concluded, edition.archived… */
export type EditionEventType = `edition.${EditionStatus}`;

export type DomainEventType = DomainEvent['type'];
/** Gli eventi di stato hanno un tipo "modello" (edition.${stato}): Extract da solo non li trova. */
type EventOf<T extends DomainEventType> = T extends EditionEventType ? Extract<DomainEvent, { type: EditionEventType }> & { type: T } : Extract<DomainEvent, { type: T }>;
type Handler<T extends DomainEventType> = (event: EventOf<T>) => void | Promise<void>;
type AnyHandler = (event: DomainEvent) => void | Promise<void>;

const handlers = new Map<DomainEventType | '*', AnyHandler[]>();

/** Iscrive un handler a un tipo di evento ('*' = tutti). Restituisce la funzione per disiscriverlo. */
export function on<T extends DomainEventType>(type: T | '*', handler: Handler<T>): () => void {
  const fn = handler as unknown as AnyHandler;
  handlers.set(type, [...(handlers.get(type) ?? []), fn]);
  return () => handlers.set(type, (handlers.get(type) ?? []).filter((h) => h !== fn));
}

/**
 * Esegue gli handler, in ordine, dopo il commit. Un handler che fallisce viene registrato nei log
 * e non ferma gli altri: l'operazione è già confermata e non si può annullare da qui.
 */
export async function publish(events: DomainEvent[]): Promise<void> {
  for (const event of events) {
    for (const handler of [...(handlers.get(event.type) ?? []), ...(handlers.get('*') ?? [])]) {
      try {
        await handler(event);
      } catch (error) {
        log.error('Handler di un evento di dominio fallito', { event: event.type, error });
      }
    }
  }
}

const registered = new Set<string>();

/**
 * Iscrive un gruppo di handler una volta sola per questa copia del modulo. Non si usa globalThis:
 * Next può caricare più copie di questo file (una per rotta) e ognuna deve avere i suoi handler.
 */
export function registerOnce(key: string, register: () => void): void {
  if (registered.has(key)) return;
  registered.add(key);
  register();
}

/** Per ora l'unico handler collegato: una riga di log per evento. */
on('*', (event) => log.info(`evento ${event.type}`, { ...event }));
