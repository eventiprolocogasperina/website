// Tipi dello scanner nuovo lato browser: gli stessi del dominio, già serializzati in JSON (date come stringhe).
import type { Counter, OfflineManifest, ScannedTicket, ScannerSetup, SearchOrder, SyncOutcome } from '@/server/domain/checkin';

export type { Counter, OfflineManifest, ScannedTicket, ScannerSetup, SearchOrder, SyncOutcome };

export type ScanResponse =
  | { result: 'valid'; checkinId: string; at: string; ticket: ScannedTicket }
  | { result: 'already_used'; at: string; by: string | null; ticket: ScannedTicket }
  | { result: 'wrong_session' | 'wrong_list' | 'void' | 'blocked'; ticket: ScannedTicket }
  | { result: 'unknown' };

export type OnlineScan = ScanResponse & { counter: Counter; answers: Record<string, number> };

/** Esito calcolato sul telefono senza rete, dall'elenco scaricato. */
export type OfflineScan = { result: 'valid' | 'already_used' | 'wrong_session' | 'unknown' | 'no_manifest'; validOn?: string | null; clientId?: string };

export type Outcome = { source: 'online'; data: OnlineScan } | { source: 'offline'; data: OfflineScan };

/** Scelte fatte all'avvio, ricordate sul telefono. */
export type Choice = { edition: string; listId: string; sessionId: string | null };
