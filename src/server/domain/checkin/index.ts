// Check-in (ARCHITETTURA §12.3, prompt 09 e 15): scansione, annullo, liste, statistiche,
// ricerca manuale, modalità offline, azioni dei moduli e flag dello scanner nuovo.
export { scan, revertCheckin, ScanInput, RevertCheckinInput, loadSessionGraph, type ScanResult, type ScannedTicket, type ScanOptions } from './scan';
export { listCheckinLists, saveCheckinList, deleteCheckinList, checkinListOptions, CheckinListInput, type CheckinListRow } from './lists';
export { listCounters, checkinStats, type Counter, type CheckinStats } from './stats';
export { searchTickets, SearchInput, type SearchOrder } from './search';
export { offlineManifest, syncOfflineCheckins, qrHash, SyncInput, type OfflineManifest, type SyncOutcome } from './offline';
export { applyScannerAction, answerCounts, scannerActionsFor, ScannerActionInput, type ScannerActionResult } from './actions';
export { scannerActionQuote, payScannerAction, paidActionProducts, ActionQuoteInput, PayActionInput, type ActionQuote, type PayActionResult } from './paid';
export { scannerV2Enabled, setScannerV2, SCANNER_FLAG } from './flag';
export { scannerSetup, scannerEditions, type ScannerSetup } from './setup';
