// Coda delle vendite fatte senza rete (§12.1 punto 7). Ogni vendita ha la chiave di idempotenza
// generata dal telefono: reinviarla (anche due volte, anche da due schede) non crea doppioni, perché
// il server restituisce la vendita già registrata. La logica è pura e si prova con memoryStore();
// sul telefono la coda vive in IndexedDB (indexedDbStore) e sopravvive a una ricarica della pagina.

export type QueuedSalePayload = {
  cashSessionId: string;
  /** Prodotti del listino, oppure "Altro" con l'importo digitato. */
  lines: Array<{ productId: string; quantity: number } | { openAmountCents: number; quantity: number }>;
  method: 'cash' | 'card_pos' | 'complimentary';
  cashReceivedCents?: number | null;
  complimentaryReason?: string | null;
  idempotencyKey: string;
  /** Ora del telefono al momento della vendita (ISO). */
  offlineAt: string;
};

export type QueuedSale = {
  key: string;
  payload: QueuedSalePayload;
  /** Totale calcolato sul telefono con i prezzi in memoria, solo per mostrarlo. */
  totalCents: number;
  attempts: number;
  /** Rifiutata dal server per un motivo che un nuovo tentativo non risolve: va mostrata a un responsabile. */
  failed?: string;
};

export interface QueueStore {
  all(): Promise<QueuedSale[]>;
  put(item: QueuedSale): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Esito dell'invio di una vendita al server. */
export type SendOutcome = { status: 'ok' } | { status: 'retry'; error: string } | { status: 'rejected'; error: string };

/**
 * Classifica una risposta HTTP: 2xx inviata; rete assente, 401 (PIN scaduto), 429 e 5xx si riprovano;
 * gli altri 4xx (turno di un'altra edizione, vendite chiuse…) restano in coda segnati.
 */
export function outcomeOf(status: number | null, error = ''): SendOutcome {
  if (status !== null && status >= 200 && status < 300) return { status: 'ok' };
  if (status === null || status === 401 || status === 408 || status === 429 || status >= 500) return { status: 'retry', error: error || 'Rete assente' };
  return { status: 'rejected', error: error || `Errore ${status}` };
}

export type FlushResult = { sent: number; rejected: number; remaining: number; stoppedByNetwork: boolean };

/**
 * Invia la coda in ordine, una vendita alla volta. Si ferma al primo errore di rete (inutile
 * insistere); le vendite rifiutate restano in coda con il motivo e non bloccano le successive.
 */
export async function flushQueue(store: QueueStore, send: (item: QueuedSale) => Promise<SendOutcome>): Promise<FlushResult> {
  const items = (await store.all()).sort((a, b) => a.payload.offlineAt.localeCompare(b.payload.offlineAt));
  let sent = 0;
  let rejected = 0;
  let stoppedByNetwork = false;
  for (const item of items) {
    if (item.failed) continue;
    const outcome = await send(item);
    if (outcome.status === 'ok') {
      await store.remove(item.key);
      sent++;
    } else if (outcome.status === 'rejected') {
      await store.put({ ...item, attempts: item.attempts + 1, failed: outcome.error });
      rejected++;
    } else {
      await store.put({ ...item, attempts: item.attempts + 1 });
      stoppedByNetwork = true;
      break;
    }
  }
  const remaining = (await store.all()).length;
  return { sent, rejected, remaining, stoppedByNetwork };
}

export function memoryStore(initial: QueuedSale[] = []): QueueStore {
  const map = new Map(initial.map((i) => [i.key, i]));
  return {
    all: async () => [...map.values()],
    put: async (item) => void map.set(item.key, item),
    remove: async (key) => void map.delete(key),
  };
}

const DB_NAME = 'proloco-cassa';
const STORE = 'queue';
const KV = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' });
      if (!req.result.objectStoreNames.contains(KV)) req.result.createObjectStore(KV);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result as T);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Coda in IndexedDB: resta anche se il telefono ricarica la pagina o si spegne. */
export function indexedDbStore(): QueueStore {
  return {
    all: () => run<QueuedSale[]>(STORE, 'readonly', (s) => s.getAll()),
    put: async (item) => void (await run(STORE, 'readwrite', (s) => s.put(item))),
    remove: async (key) => void (await run(STORE, 'readwrite', (s) => s.delete(key))),
  };
}

/** Piccolo archivio chiave → valore nello stesso database (ultimo listino, per vendere offline). */
export const kv = {
  get: <T>(key: string) => run<T | undefined>(KV, 'readonly', (s) => s.get(key)).catch(() => undefined),
  set: (key: string, value: unknown) => run(KV, 'readwrite', (s) => s.put(value, key)).catch(() => undefined),
};
