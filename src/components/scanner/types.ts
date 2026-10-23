// Tipi dello scanner nuovo lato browser: gli stessi del dominio, già serializzati in JSON (date come stringhe).
import type { ActionQuote, CollectQuote, Counter, OfflineManifest, OrderTicketState, PayActionResult, ScannedTicket, ScannerSetup, SearchOrder, SyncOutcome } from '@/server/domain/checkin';
import type { CollectResult } from '@/server/domain/cash/collect';

export type { ActionQuote, CollectQuote, CollectResult, Counter, OfflineManifest, OrderTicketState, PayActionResult, ScannedTicket, ScannerSetup, SearchOrder, SyncOutcome };

/** Un biglietto dell'ordine nell'elenco da confermare. */
export type OrderTicketJson = ScannedTicket & { state: OrderTicketState; at?: string; by?: string | null; checkinId?: string };

export type ScanResponse =
  | { result: 'valid'; checkinId: string; at: string; ticket: ScannedTicket }
  | { result: 'already_used'; checkinId: string; at: string; by: string | null; ticket: ScannedTicket }
  | { result: 'wrong_session' | 'wrong_list' | 'void' | 'blocked'; ticket: ScannedTicket }
  | { result: 'to_pay'; dueCents: number; ticket: ScannedTicket }
  | { result: 'unknown' }
  /** QR letto: l'ordine con i biglietti da confermare ("Fai entrare N"). Nessun ingresso ancora. */
  | { result: 'order'; ticket: ScannedTicket; tickets: OrderTicketJson[] }
  /** Dopo "Fai entrare N". */
  | {
      result: 'entered';
      ticket: ScannedTicket;
      entered: Array<{ ticketId: string; checkinId: string; at: string }>;
      skipped: Array<{ ticketId: string; result: string; at?: string; by?: string | null }>;
      tickets: ScannedTicket[];
    };

export type OnlineScan = ScanResponse & { answers: Record<string, number> };

/** Un biglietto dello stesso ordine secondo l'elenco offline (niente nomi né codici). */
export type OfflineGroupTicket = { hash: string; ticketId: string; productName: string; validOn: string | null; state: 'ready' | 'already_used' | 'wrong_session'; scanned: boolean };

/** Esito calcolato sul telefono senza rete, dall'elenco scaricato. */
export type OfflineScan =
  | { result: 'valid' | 'already_used' | 'wrong_session' | 'unknown' | 'no_manifest'; validOn?: string | null; clientId?: string }
  /** Elenco con i dati dei gruppi: l'ordine da confermare. */
  | { result: 'order'; tickets: OfflineGroupTicket[] }
  /** Dopo "Fai entrare N" offline: passaggi in coda. */
  | { result: 'entered'; count: number; products: string[] };

export type Outcome = { source: 'online'; data: OnlineScan } | { source: 'offline'; data: OfflineScan };

/** Scelte fatte all'avvio, ricordate sul telefono. */
export type Choice = { edition: string; listId: string; sessionId: string | null };

/** Risposta di "Incassa" al varco (/api/scanner/collect): dopo l'incasso, l'ordine da confermare. */
export type CollectResponse = { collected: CollectResult | null; scan: OnlineScan };
