'use client';

import { ArrowLeft, CheckCircle2, Search, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, Input, Skeleton, cn, focusRing } from '@/components/ui';
import { CassaError, cassaFetch } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import type { CollectResult, PayOnSiteOrder } from '@/server/domain/cash/collect';
import { newIdempotencyKey, type ApiFn } from './api';
import { BigButton } from './Keypad';
import { Payment, type PaymentChoice } from './Payment';

type Props = { api: ApiFn; sessionId: string; onBack: () => void };

/**
 * "Da incassare": gli ordini "Paga in loco" dell'edizione, per codice o nome. Si incassa nel turno
 * in corso (contanti o carta) e l'ordine diventa pagato. L'importo lo decide il server.
 */
export function CollectOnSite({ api, sessionId, onBack }: Props) {
  const [q, setQ] = useState('');
  const [retry, setRetry] = useState(0);
  const [orders, setOrders] = useState<PayOnSiteOrder[] | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<PayOnSiteOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const [done, setDone] = useState<CollectResult | null>(null);
  // Una chiave per ordine scelto: un reinvio (rete ballerina) non incassa due volte.
  const [key, setKey] = useState(newIdempotencyKey);

  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(() => {
      cassaFetch<{ orders: PayOnSiteOrder[] }>(api('da-incassare', { q: q.trim() }))
        .then((r) => alive && (setOrders(r.orders), setError('')))
        .catch((e) => alive && setError((e as CassaError).message));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [api, q, retry]);

  async function pay(choice: PaymentChoice) {
    if (!picked || choice.method === 'complimentary') return;
    setBusy(true);
    setPayError('');
    try {
      const r = await cassaFetch<CollectResult>(api('da-incassare'), {
        method: 'POST',
        body: JSON.stringify({ orderId: picked.orderId, cashSessionId: sessionId, method: choice.method, cashReceivedCents: choice.cashReceivedCents, idempotencyKey: key, expectedDueCents: picked.dueCents }),
      });
      setDone(r);
    } catch (e) {
      setPayError((e as CassaError).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 size={56} className="text-success" aria-hidden />
        <p className="text-title font-semibold">Incassato {formatMoney(done.amountCents)}</p>
        <p className="text-body text-muted">
          Ordine {done.code} · {done.method === 'cash' ? 'Contanti' : 'Carta (POS)'}
          {done.changeCents ? ` · resto ${formatMoney(done.changeCents)}` : ''}
        </p>
        <p className="text-body">L’ordine è pagato: i biglietti ora valgono all’ingresso.</p>
        <BigButton className="mt-2 w-full" onClick={onBack}>
          Torna alla vendita
        </BigButton>
      </div>
    );
  }

  if (picked) {
    return (
      <div>
        <p className="mx-auto mb-1 w-full max-w-md text-body text-muted">
          {picked.code}
          {picked.name ? ` · ${picked.name}` : ''} · {picked.summary}
        </p>
        <Payment totalCents={picked.dueCents} busy={busy} error={payError} allowComplimentary={false} backLabel="Torna agli ordini da incassare" onBack={() => (setPicked(null), setPayError(''))} onConfirm={pay} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-1 text-body text-muted">
        <ArrowLeft size={18} aria-hidden /> Torna alla vendita
      </button>
      <h2 className="mb-1 text-title font-semibold">Da incassare</h2>
      <p className="mb-3 text-body text-muted">Ordini «Paga in loco»: cerca per codice o nome e incassa nel turno.</p>
      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Codice ordine o nome" aria-label="Cerca un ordine da incassare" className="h-12 pl-10" autoFocus />
      </div>
      {error ? (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : !orders ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={Wallet} title={q.trim() ? 'Nessun ordine da incassare con questa ricerca' : 'Nessun ordine da incassare'} />
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((o) => (
            <li key={o.orderId}>
              <button
                type="button"
                onClick={() => (setPicked(o), setKey(newIdempotencyKey()))}
                className={cn('flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left', focusRing)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{o.name ?? 'Senza nome'}</span>
                  <span className="block truncate text-label text-muted">
                    {o.code} · {o.summary}
                  </span>
                </span>
                <span className="text-section font-bold tabular-nums">{formatMoney(o.dueCents)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
