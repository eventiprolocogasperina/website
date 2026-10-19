'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { kv } from '@/lib/cash/offline-queue';
import { CassaError, cassaFetch, type CassaState, type PosCatalog } from '@/lib/cash/types';
import type { ApiFn } from './api';

export type Load<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'forbidden'; message: string }
  | { status: 'ready'; data: T; cached: boolean };

/**
 * Stato iniziale della cassa (casse, turni aperti, reparti, responsabili). Senza rete usa l'ultima
 * copia salvata sul telefono, così si continua a vendere anche dopo una ricarica della pagina.
 */
export function useCassaState(api: ApiFn) {
  const [state, setState] = useState<Load<CassaState>>({ status: 'loading' });

  const reload = useCallback(async () => {
    try {
      const data = await cassaFetch<CassaState>(api('state'));
      await kv.set('state', data);
      setState({ status: 'ready', data, cached: false });
    } catch (e) {
      const err = e as CassaError;
      if (err.status === 403) return setState({ status: 'forbidden', message: err.message });
      const cached = err.status === null ? await kv.get<CassaState>('state') : undefined;
      if (cached) setState({ status: 'ready', data: cached, cached: true });
      else setState({ status: 'error', message: err.message });
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload };
}

/**
 * Listino della cassa con prezzi e scorte. Parte dalla copia salvata (vendita offline), poi la rete,
 * poi gli aggiornamenti in tempo reale via SSE: gli esauriti degli altri telefoni arrivano da soli.
 */
export function usePosCatalog(api: ApiFn, registerId: string | null) {
  const [catalog, setCatalog] = useState<PosCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const versionRef = useRef('');

  const accept = useCallback(
    (c: PosCatalog) => {
      if (!registerId || c.register.id !== registerId) return;
      versionRef.current = c.version;
      setCatalog(c);
      setError(null);
      kv.set(`catalog:${registerId}`, c);
    },
    [registerId],
  );

  const reload = useCallback(async () => {
    if (!registerId) return;
    try {
      accept(await cassaFetch<PosCatalog>(api('catalog', { cassa: registerId })));
    } catch (e) {
      const err = e as CassaError;
      // Senza rete si resta sul listino salvato; l'errore si mostra solo se non c'è niente.
      if (err.status !== null) setError(err.message);
      else if (!versionRef.current) setError('Connessione assente e nessun listino salvato su questo telefono.');
    }
  }, [api, registerId, accept]);

  useEffect(() => {
    if (!registerId) return;
    let cancelled = false;
    kv.get<PosCatalog>(`catalog:${registerId}`).then((c) => {
      if (!cancelled && c && !versionRef.current) {
        versionRef.current = c.version;
        setCatalog(c);
      }
    });
    reload();
    return () => {
      cancelled = true;
    };
  }, [registerId, reload]);

  useEffect(() => {
    if (!registerId || typeof EventSource === 'undefined') return;
    const es = new EventSource(api('stream', { cassa: registerId }));
    es.addEventListener('catalog', (ev) => {
      try {
        accept(JSON.parse((ev as MessageEvent).data) as PosCatalog);
      } catch {
        // messaggio malformato: si aspetta il prossimo
      }
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [api, registerId, accept]);

  return { catalog, error, live, reload };
}
