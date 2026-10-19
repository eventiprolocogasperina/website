// Modalità offline in sola lettura dello scanner: elenco delle impronte dei QR validi (scaricato in
// anticipo, senza dati personali), controllo sul telefono e coda dei passaggi da sincronizzare.
import type { OfflineManifest, OfflineScan } from './types';

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

export type QueuedCheckin = { clientId: string; qrToken: string; checkinListId: string; sessionId: string | null; at: string; hash: string };

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
