'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api, NetworkError, qs } from './api';
import { signal } from './feedback';
import { checkOfflineOrder, fullEntry, newClientId, offlineCounter, qrHashBrowser, store, type QueuedCheckin } from './offline';
import { present } from './present';
import type { CollectResponse, Counter, OnlineScan, Outcome, ScannerSetup } from './types';
import { useOffline, useOnline } from './useOffline';

export const UNDO_MS = 30_000;
const SAME_CODE_MS = 2500;

/** "Annulla ultimo": l'ultimo ingresso, o tutti quelli dell'ultimo "Fai entrare N". */
type Undo = { kind: 'online'; checkinIds: string[]; until: number } | { kind: 'offline'; clientIds: string[]; until: number };

/**
 * Stato dello scanner: lettura (online, o offline dall'elenco scaricato), conferma dell'ordine
 * ("Fai entrare N"), esito, contatori, "Annulla ultimo" per 30 secondi e pulsanti dei moduli.
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

  const canStats = setup.permissions?.stats ?? true;
  const refreshCounter = useCallback(async () => {
    if (!canStats) return;
    if (!online) {
      if (offline.manifest) setCounter(offlineCounter(offline.manifest, effectiveSession, store.used(listId)));
      return;
    }
    try {
      setCounter(await api<Counter>(`counters?${qs({ lista: listId, data: effectiveSession })}`));
    } catch {
      // I contatori si riprovano al prossimo giro.
    }
  }, [canStats, online, offline.manifest, effectiveSession, listId]);

  const scanOffline = useCallback(
    async (code: string) => {
      const hash = await qrHashBrowser(code);
      const r = checkOfflineOrder(offline.manifest, hash, effectiveSession, store.used(listId));
      // Elenco vecchio, senza gli ordini: entra subito il biglietto letto, come prima.
      if (r.result === 'valid' && hash) {
        const clientId = newClientId();
        offline.enqueue({ clientId, qrToken: code, checkinListId: listId, sessionId: effectiveSession, at: new Date().toISOString(), hash });
        setUndo({ kind: 'offline', clientIds: [clientId], until: Date.now() + UNDO_MS });
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
        // Un QR apre l'ordine da confermare; dalla ricerca ("Fai entrare" su un biglietto) entra subito.
        const data = await api<OnlineScan>(input.qrToken ? 'order' : 'scan', { method: 'POST', body: { ...input, checkinListId: listId, sessionId: effectiveSession, questionKeys } });
        if (data.result === 'valid') setUndo({ kind: 'online', checkinIds: [data.checkinId], until: Date.now() + UNDO_MS });
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
        if (!offline.dequeue(undo.clientIds)) throw new ApiError('Il passaggio è già stato sincronizzato: annullalo quando torna la rete.', 409);
      } else {
        // Un annullo per biglietto, come sempre (audit per ciascuno). Chi è già stato annullato si salta.
        const left = [...undo.checkinIds];
        try {
          while (left.length) {
            await api('revert', { method: 'POST', body: { checkinId: left[0] } }).catch((e) => {
              if (!(e instanceof ApiError && e.status === 409)) throw e;
            });
            left.shift();
          }
        } finally {
          if (left.length) setUndo({ ...undo, checkinIds: left });
        }
      }
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
      setUndo((u) => {
        if (u?.kind !== 'online' || !u.checkinIds.includes(checkinId)) return u;
        const rest = u.checkinIds.filter((id) => id !== checkinId);
        return rest.length ? { ...u, checkinIds: rest } : null;
      });
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

  /** Dopo l'incasso al varco di un ordine "Paga in loco": si apre l'ordine da confermare. */
  const collected = useCallback(
    (r: CollectResponse) => {
      show({ source: 'online', data: r.scan });
      void refreshCounter();
    },
    [show, refreshCounter],
  );

  /** Passaggi in coda per i biglietti scelti: offline, oppure online quando la rete cade alla conferma. */
  const queueGroup = useCallback(
    (items: Array<{ ticketId: string; clientId: string; hash?: string; productName: string }>) => {
      const at = new Date().toISOString();
      const byTicket = new Map((offline.manifest?.entries ?? []).filter(fullEntry).map((e) => [e[5], e[0]] as const));
      const queued: QueuedCheckin[] = items.map((i) => ({ clientId: i.clientId, ticketId: i.ticketId, checkinListId: listId, sessionId: effectiveSession, at, hash: i.hash ?? byTicket.get(i.ticketId) ?? '' }));
      offline.enqueue(...queued);
      setUndo({ kind: 'offline', clientIds: queued.map((q) => q.clientId), until: Date.now() + UNDO_MS });
      show({ source: 'offline', data: { result: 'entered', count: items.length, products: items.map((i) => i.productName) } });
      void refreshCounter();
    },
    [offline, listId, effectiveSession, show, refreshCounter],
  );

  /**
   * "Fai entrare N" sull'ordine aperto: un passaggio per biglietto scelto, tutti insieme. Online in
   * una sola transazione; senza rete (o se la rete cade adesso) in coda, un passaggio per biglietto,
   * con lo stesso clientId: se la richiesta era arrivata, la sincronizzazione non crea doppioni.
   */
  const confirmGroup = useCallback(
    async (ticketIds: string[]) => {
      if (outcome?.data.result !== 'order' || !ticketIds.length) return;
      setError(null);
      if (outcome.source === 'offline') {
        const chosen = outcome.data.tickets.filter((t) => ticketIds.includes(t.ticketId));
        return queueGroup(chosen.map((t) => ({ ticketId: t.ticketId, clientId: newClientId(), hash: t.hash, productName: t.productName })));
      }
      const tickets = outcome.data.tickets.filter((t) => ticketIds.includes(t.id));
      const items = tickets.map((t) => ({ ticketId: t.id, clientId: newClientId(), productName: t.productName }));
      setBusy(true);
      try {
        const data = await api<OnlineScan>('group', { method: 'POST', body: { checkinListId: listId, sessionId: effectiveSession, items: items.map(({ ticketId, clientId }) => ({ ticketId, clientId })), questionKeys }, timeoutMs: 8000 });
        if (data.result === 'entered' && data.entered.length) setUndo({ kind: 'online', checkinIds: data.entered.map((e) => e.checkinId), until: Date.now() + UNDO_MS });
        show({ source: 'online', data });
        void refreshCounter();
      } catch (e) {
        if (e instanceof NetworkError) return queueGroup(items);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [outcome, listId, effectiveSession, questionKeys, queueGroup, show, refreshCounter],
  );

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

  return { online, offline, outcome, dismiss: () => setOutcome(null), counter, undo, revertLast, revertLater, runAction, setAnswer, collected, confirmGroup, effectiveSession, submit, onCode, busy, error, clearError: () => setError(null) };
}
