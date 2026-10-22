'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, NetworkError, qs } from './api';
import { signal } from './feedback';
import { checkOffline, newClientId, offlineCounter, qrHashBrowser, store } from './offline';
import { present } from './present';
import type { Counter, OnlineScan, Outcome, ScannerSetup } from './types';
import { useOffline, useOnline } from './useOffline';

export const UNDO_MS = 30_000;
const SAME_CODE_MS = 2500;

type Undo = { kind: 'online'; checkinId: string; until: number } | { kind: 'offline'; clientId: string; until: number };

/**
 * Stato dello scanner: lettura (online, o offline dall'elenco scaricato), esito, contatori,
 * "Annulla ultimo" per 30 secondi e pulsanti dei moduli.
 */
export function useScanner(setup: ScannerSetup, listId: string, sessionId: string | null, muted: boolean) {
  const online = useOnline();
  const offline = useOffline(listId, online);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [counter, setCounter] = useState<Counter | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ code: string; at: number } | null>(null);
  const questionKeys = setup.actions.map((a) => a.questionKey);
  const effectiveSession = setup.lists.find((l) => l.id === listId)?.sessionId ?? sessionId;

  const show = useCallback(
    (o: Outcome) => {
      setOutcome(o);
      signal(present(o).tone, muted);
    },
    [muted],
  );

  const refreshCounter = useCallback(async () => {
    if (!online) {
      if (offline.manifest) setCounter(offlineCounter(offline.manifest, effectiveSession, store.used(listId)));
      return;
    }
    try {
      setCounter(await api<Counter>(`counters?${qs({ lista: listId, data: effectiveSession })}`));
    } catch {
      // I contatori si riprovano al prossimo giro.
    }
  }, [online, offline.manifest, effectiveSession, listId]);

  const scanOffline = useCallback(
    async (code: string) => {
      const hash = await qrHashBrowser(code);
      const r = checkOffline(offline.manifest, hash, effectiveSession, store.used(listId));
      if (r.result === 'valid' && hash) {
        const clientId = newClientId();
        offline.enqueue({ clientId, qrToken: code, checkinListId: listId, sessionId: effectiveSession, at: new Date().toISOString(), hash });
        setUndo({ kind: 'offline', clientId, until: Date.now() + UNDO_MS });
        show({ source: 'offline', data: { ...r, clientId } });
      } else show({ source: 'offline', data: r });
      void refreshCounter();
    },
    [offline, effectiveSession, listId, show, refreshCounter],
  );

  const submit = useCallback(
    async (input: { qrToken?: string; ticketId?: string }) => {
      setBusy(true);
      setError(null);
      try {
        if (!online && input.qrToken) return await scanOffline(input.qrToken);
        const data = await api<OnlineScan>('scan', { method: 'POST', body: { ...input, checkinListId: listId, sessionId: effectiveSession, questionKeys } });
        if (data.result === 'valid') setUndo({ kind: 'online', checkinId: data.checkinId, until: Date.now() + UNDO_MS });
        show({ source: 'online', data });
        void refreshCounter();
      } catch (e) {
        if (e instanceof NetworkError && input.qrToken) return await scanOffline(input.qrToken);
        setError(e instanceof ApiError || e instanceof NetworkError ? e.message : 'Lettura non riuscita. Riprova.');
        signal('danger', muted);
      } finally {
        setBusy(false);
      }
    },
    [online, listId, effectiveSession, questionKeys, scanOffline, show, muted, refreshCounter],
  );

  /** Da fotocamera o lettore: ignora lo stesso codice letto di nuovo entro 2,5 secondi o con un esito aperto. */
  const onCode = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code || busy || outcome) return;
      const now = Date.now();
      if (last.current && last.current.code === code && now - last.current.at < SAME_CODE_MS) return;
      last.current = { code, at: now };
      void submit({ qrToken: code });
    },
    [busy, outcome, submit],
  );

  const revertLast = useCallback(async () => {
    if (!undo || Date.now() > undo.until) return setUndo(null);
    try {
      if (undo.kind === 'offline') {
        if (!offline.dequeue(undo.clientId)) throw new ApiError('Il passaggio è già stato sincronizzato: annullalo quando torna la rete.', 409);
      } else await api('revert', { method: 'POST', body: { checkinId: undo.checkinId } });
      setUndo(null);
      setOutcome(null);
      setError(null);
      void refreshCounter();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Annullo non riuscito.');
      return false;
    }
  }, [undo, offline, refreshCounter]);

  /** Annullo fatto dopo, con conferma, dalla ricerca o dall'esito "Già entrato": serve la rete. */
  const revertLater = useCallback(
    async (checkinId: string, from: 'ricerca' | 'esito') => {
      await api('revert', { method: 'POST', body: { checkinId, from } });
      setUndo((u) => (u?.kind === 'online' && u.checkinId === checkinId ? null : u));
      if (from === 'esito') setOutcome(null);
      void refreshCounter();
    },
    [refreshCounter],
  );

  const runAction = useCallback(
    async (key: string) => {
      if (outcome?.source !== 'online' || !('ticket' in outcome.data)) return;
      const r = await api<{ questionKey: string; after: number }>('action', { method: 'POST', body: { orderId: outcome.data.ticket.orderId, actionKey: key } });
      setOutcome((o) => (o?.source === 'online' ? { ...o, data: { ...o.data, answers: { ...o.data.answers, [r.questionKey]: r.after } } } : o));
      return r;
    },
    [outcome],
  );

  /** Conteggio aggiornato da fuori (popup di cassa di un pulsante a pagamento). */
  const setAnswer = useCallback((questionKey: string, after: number) => {
    setOutcome((o) => (o?.source === 'online' ? { ...o, data: { ...o.data, answers: { ...o.data.answers, [questionKey]: after } } } : o));
  }, []);

  useEffect(() => {
    const first = window.setTimeout(refreshCounter, 0);
    const id = window.setInterval(refreshCounter, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [refreshCounter]);

  // Il pulsante "Annulla ultimo" sparisce da solo dopo 30 secondi.
  useEffect(() => {
    if (!undo) return;
    const id = window.setTimeout(() => setUndo(null), Math.max(0, undo.until - Date.now()));
    return () => window.clearTimeout(id);
  }, [undo]);

  return { online, offline, outcome, dismiss: () => setOutcome(null), counter, undo, revertLast, revertLater, runAction, setAnswer, submit, onCode, busy, error, clearError: () => setError(null) };
}
