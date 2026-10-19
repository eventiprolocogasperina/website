'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushQueue, indexedDbStore, memoryStore, outcomeOf, type QueuedSale, type QueueStore } from '@/lib/cash/offline-queue';
import { CassaError, cassaFetch, type PayMethod, type PosCatalog, type Sale } from '@/lib/cash/types';
import { isOffline, newIdempotencyKey, type ApiFn } from './api';

const FLUSH_EVERY_MS = 15_000;

export type CartLine = { productId: string; quantity: number };

export type SaleRequest = {
  sessionId: string;
  catalog: PosCatalog;
  cart: CartLine[];
  method: PayMethod;
  cashReceivedCents: number | null;
  complimentaryReason: string | null;
};

/** Totale del carrello con i prezzi del listino in memoria (il server ricalcola sempre, §18.1). */
export function cartTotal(catalog: PosCatalog, cart: CartLine[]): number {
  return cart.reduce((sum, l) => sum + (catalog.products.find((p) => p.id === l.productId)?.priceCents ?? 0) * l.quantity, 0);
}

/**
 * Vendite e coda offline. Con la rete la vendita va subito al server; se la rete manca (o cade a
 * metà) la vendita finisce in IndexedDB con la sua chiave e parte da sola quando torna la rete.
 * Lo stesso invio ripetuto non crea doppioni: il server riconosce la chiave.
 */
export function useSaleQueue(api: ApiFn) {
  const storeRef = useRef<QueueStore | null>(null);
  const flushing = useRef(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<QueuedSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);

  const store = useCallback((): QueueStore => {
    if (!storeRef.current) storeRef.current = typeof indexedDB === 'undefined' ? memoryStore() : indexedDbStore();
    return storeRef.current;
  }, []);

  const refresh = useCallback(async () => {
    const all = await store()
      .all()
      .catch(() => [] as QueuedSale[]);
    setPending(all.filter((i) => !i.failed).length);
    setFailed(all.filter((i) => i.failed));
  }, [store]);

  const flush = useCallback(async () => {
    if (flushing.current || isOffline()) return;
    flushing.current = true;
    setSyncing(true);
    try {
      await flushQueue(store(), async (item) => {
        try {
          await cassaFetch(api('sales'), { method: 'POST', body: JSON.stringify(item.payload) });
          return { status: 'ok' };
        } catch (e) {
          const err = e as CassaError;
          return outcomeOf(err.status, err.message);
        }
      });
    } finally {
      flushing.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [api, store, refresh]);

  /** Rimette in coda una vendita rifiutata (dopo che un responsabile ha sistemato, es. riaperto il turno). */
  const retry = useCallback(
    async (key: string) => {
      const item = (await store().all()).find((i) => i.key === key);
      if (item) await store().put({ ...item, failed: undefined });
      await flush();
    },
    [store, flush],
  );

  useEffect(() => {
    const up = () => {
      setOnline(true);
      flush();
    };
    const down = () => setOnline(false);
    setOnline(!isOffline());
    refresh().then(flush);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    const timer = setInterval(flush, FLUSH_EVERY_MS);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      clearInterval(timer);
    };
  }, [flush, refresh]);

  /** Registra una vendita: online se si può, altrimenti in coda. Gli errori del server (esaurito, prezzo cambiato…) si rilanciano. */
  const submit = useCallback(
    async (req: SaleRequest): Promise<Sale> => {
      const totalCents = cartTotal(req.catalog, req.cart);
      const payload = {
        cashSessionId: req.sessionId,
        lines: req.cart,
        method: req.method,
        cashReceivedCents: req.method === 'cash' ? req.cashReceivedCents : null,
        complimentaryReason: req.method === 'complimentary' ? req.complimentaryReason : null,
        idempotencyKey: newIdempotencyKey(),
      };
      if (!isOffline()) {
        try {
          return await cassaFetch<Sale>(api('sales'), { method: 'POST', body: JSON.stringify({ ...payload, expectedTotalCents: totalCents }) });
        } catch (e) {
          if ((e as CassaError).status !== null) throw e;
          // Rete caduta a metà: la vendita potrebbe essere già sul server. Va in coda con la stessa chiave.
        }
      }
      const at = new Date().toISOString();
      await store().put({ key: payload.idempotencyKey, payload: { ...payload, offlineAt: at }, totalCents, attempts: 0 });
      await refresh();
      return localSale(req, totalCents, at);
    },
    [api, store, refresh],
  );

  return { pending, failed, syncing, online, flush, retry, submit };
}

function localSale(req: SaleRequest, totalCents: number, at: string): Sale {
  const received = req.method === 'cash' ? (req.cashReceivedCents ?? totalCents) : null;
  return {
    orderId: '',
    code: '',
    number: null,
    totalCents,
    method: req.method,
    cashReceivedCents: received,
    changeCents: received !== null ? received - totalCents : null,
    complimentaryReason: req.complimentaryReason,
    registerName: req.catalog.register.name,
    lines: req.cart.map((l) => {
      const p = req.catalog.products.find((x) => x.id === l.productId)!;
      return { productId: p.id, name: p.name, quantity: l.quantity, unitPriceCents: p.priceCents, totalCents: p.priceCents * l.quantity, department: p.department };
    }),
    at,
    created: true,
    oversold: false,
    afterClose: false,
    queued: true,
  };
}
