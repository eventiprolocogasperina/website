// Modalità offline in sola lettura dello scanner: elenco delle impronte dei QR validi (scaricato in
// anticipo, senza dati personali), controllo sul telefono e coda dei passaggi da sincronizzare.
import type { OfflineGroupTicket, OfflineManifest, OfflineScan } from './types';

/** Stessa impronta del server (qrHash in src/server/domain/checkin/offline.ts): sha256, 32 caratteri esadecimali. */
export async function qrHashBrowser(token: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null; // solo in HTTPS o su localhost
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token.trim()));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/** Controllo offline: `localUsed` sono le impronte entrate da questo telefono dopo lo scaricamento. */
export function checkOffline(manifest: OfflineManifest | null, hash: string | null, sessionId: string | null, localUsed: ReadonlySet<string>): OfflineScan {
  if (!manifest || !hash) return { result: 'no_manifest' };
  const entry = manifest.entries.find((e) => e[0] === hash);
  if (!entry) return { result: 'unknown' };
  const [, sessionIndex, used] = entry;
  const valid = sessionIndex >= 0 ? manifest.sessions[sessionIndex] : null;
  if (sessionId && valid && valid.id !== sessionId) return { result: 'wrong_session', validOn: valid.label };
  if (used || localUsed.has(hash)) return { result: 'already_used' };
  return { result: 'valid' };
}

type Entry = OfflineManifest['entries'][number];
type FullEntry = [string, number, 0 | 1, number, number, string];
/** Voce con ordine, prodotto e ID del biglietto (elenchi scaricati dopo l'ingresso di gruppo). */
export const fullEntry = (e: Entry): e is FullEntry => e.length >= 6;

/**
 * Lettura offline per l'ingresso di gruppo: con un elenco che sa a quale ordine appartiene ogni QR,
 * i biglietti dello stesso ordine da confermare. Con un elenco vecchio (senza ordine), con un QR non
 * valido o se nessuno può entrare, l'esito del singolo biglietto come prima.
 */
export function checkOfflineOrder(manifest: OfflineManifest | null, hash: string | null, sessionId: string | null, localUsed: ReadonlySet<string>): OfflineScan {
  const single = checkOffline(manifest, hash, sessionId, localUsed);
  if (!manifest || !hash || single.result === 'unknown' || single.result === 'no_manifest') return single;
  const entry = manifest.entries.find((e) => e[0] === hash);
  if (!entry || !fullEntry(entry) || !manifest.products) return single;
  const group = entry[3];
  const tickets: OfflineGroupTicket[] = [];
  for (const e of manifest.entries) {
    if (!fullEntry(e) || e[3] !== group) continue;
    const r = checkOffline(manifest, e[0], sessionId, localUsed);
    const valid = e[1] >= 0 ? (manifest.sessions[e[1]]?.label ?? null) : null;
    tickets.push({ hash: e[0], ticketId: e[5], productName: manifest.products[e[4]] ?? 'Biglietto', validOn: valid, state: r.result === 'valid' ? 'ready' : r.result === 'wrong_session' ? 'wrong_session' : 'already_used', scanned: e[0] === hash });
  }
  return tickets.some((t) => t.state === 'ready') ? { result: 'order', tickets } : single;
}

/** Attesi ed entrati secondo l'elenco offline, più gli ingressi fatti offline da questo telefono. */
export function offlineCounter(manifest: OfflineManifest, sessionId: string | null, localUsed: ReadonlySet<string>) {
  let expected = 0;
  let entered = 0;
  for (const [hash, idx, used] of manifest.entries) {
    if (sessionId && idx >= 0 && manifest.sessions[idx]?.id !== sessionId) continue;
    expected++;
    if (used || localUsed.has(hash)) entered++;
  }
  return { expected, entered };
}

/** Un passaggio in coda: il QR letto, oppure l'ID di un altro biglietto dello stesso ordine (ingresso di gruppo). */
export type QueuedCheckin = { clientId: string; qrToken?: string; ticketId?: string; checkinListId: string; sessionId: string | null; at: string; hash: string };

const QUEUE = 'scanner:coda:v1';
const MANIFEST = (listId: string) => `scanner:elenco:v1:${listId}`;
const USED = (listId: string) => `scanner:entrati:v1:${listId}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Memoria piena o navigazione privata: la coda resta solo in memoria finché la pagina è aperta.
  }
}

export const store = {
  queue: () => read<QueuedCheckin[]>(QUEUE, []),
  setQueue: (q: QueuedCheckin[]) => write(QUEUE, q),
  manifest: (listId: string) => read<OfflineManifest | null>(MANIFEST(listId), null),
  setManifest: (m: OfflineManifest) => {
    write(MANIFEST(m.listId), m);
    // Un elenco nuovo comprende già gli ingressi sincronizzati: si tengono solo quelli ancora in coda.
    const pending = new Set(read<QueuedCheckin[]>(QUEUE, []).filter((q) => q.checkinListId === m.listId).map((q) => q.hash));
    write(USED(m.listId), [...pending]);
  },
  used: (listId: string) => new Set(read<string[]>(USED(listId), [])),
  addUsed: (listId: string, hash: string) => write(USED(listId), [...new Set([...read<string[]>(USED(listId), []), hash])]),
  removeUsed: (listId: string, hash: string) => write(USED(listId), read<string[]>(USED(listId), []).filter((h) => h !== hash)),
};

export function newClientId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
