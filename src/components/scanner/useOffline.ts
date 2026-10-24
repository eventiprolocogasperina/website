'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { store, type QueuedCheckin } from './offline';
import type { OfflineManifest, SyncOutcome } from './types';

const MANIFEST_EVERY_MS = 5 * 60_000;
const SYNC_EVERY_MS = 15_000;

/**
 * Elenco offline della lista (scaricato subito e ogni 5 minuti) e coda dei passaggi fatti senza rete,
 * rimandata ogni 15 secondi e al ritorno della connessione. La coda sopravvive a un ricaricamento.
 */
export function useOffline(listId: string, online: boolean) {
  const [manifest, setManifest] = useState<OfflineManifest | null>(() => (typeof window === 'undefined' ? null : store.manifest(listId)));
  const [queued, setQueued] = useState(() => (typeof window === 'undefined' ? 0 : store.queue().length));
  const [conflicts, setConflicts] = useState<SyncOutcome[]>([]);
  const syncing = useRef(false);

  const refreshManifest = useCallback(async () => {
    try {
      const m = await api<OfflineManifest>(`offline?lista=${listId}`, { timeoutMs: 15_000 });
      store.setManifest(m);
      setManifest(m);
    } catch {
      // Resta l'elenco precedente: la data di scaricamento è visibile nel menu.
    }
  }, [listId]);

  const sync = useCallback(async () => {
    const queue = store.queue();
    if (syncing.current || !queue.length) return;
    syncing.current = true;
    try {
      const batch = queue.slice(0, 100);
      const { outcomes } = await api<{ outcomes: SyncOutcome[] }>('sync', { method: 'POST', body: { items: batch.map((q) => ({ clientId: q.clientId, qrToken: q.qrToken, ticketId: q.ticketId, checkinListId: q.checkinListId, sessionId: q.sessionId, at: q.at })) }, timeoutMs: 20_000 });
      // Esiti definitivi (anche gli errori di dominio): escono dalla coda. Un errore di rete lascia tutto com'è.
      const done = new Set(outcomes.map((o) => o.clientId));
      store.setQueue(store.queue().filter((q) => !done.has(q.clientId)));
      const bad = outcomes.filter((o) => o.result !== 'valid');
      if (bad.length) setConflicts((c) => [...c, ...bad]);
    } catch {
      // Rete ancora assente: si riprova al prossimo giro.
    } finally {
      syncing.current = false;
      setQueued(store.queue().length);
    }
  }, []);

  const enqueue = useCallback((...items: QueuedCheckin[]) => {
    const known = new Set(store.queue().map((q) => q.clientId));
    store.setQueue([...store.queue(), ...items.filter((i) => !known.has(i.clientId))]);
    for (const item of items) if (item.hash) store.addUsed(item.checkinListId, item.hash);
    setQueued(store.queue().length);
  }, []);

  /** "Annulla ultimo" di passaggi offline non ancora sincronizzati (uno o tutto il gruppo). */
  const dequeue = useCallback((clientIds: string[]): boolean => {
    const items = store.queue().filter((q) => clientIds.includes(q.clientId));
    if (items.length !== clientIds.length) return false;
    store.setQueue(store.queue().filter((q) => !clientIds.includes(q.clientId)));
    for (const item of items) store.removeUsed(item.checkinListId, item.hash);
    setQueued(store.queue().length);
    return true;
  }, []);

  // Chi usa l'hook lo monta con key={listId}: cambiando lista l'elenco si rilegge dallo stato iniziale.
  useEffect(() => {
    if (!online) return;
    const first = window.setTimeout(() => void refreshManifest().then(sync), 0);
    const m = window.setInterval(refreshManifest, MANIFEST_EVERY_MS);
    const s = window.setInterval(sync, SYNC_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(m);
      window.clearInterval(s);
    };
  }, [listId, online, refreshManifest, sync]);

  return { manifest, queued, conflicts, clearConflicts: () => setConflicts([]), enqueue, dequeue, refreshManifest, sync };
}

/** Rete presente? navigator.onLine più gli eventi online/offline. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
