'use client';

import { Banknote, CheckCircle2, CreditCard, Loader2, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, cn, focusRing } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { api, NetworkError, qs } from './api';
import type { ActionQuote, PayActionResult } from './types';

type Method = 'cash' | 'card_pos';
type Props = { orderId: string; action: { key: string; label: string }; onClose: () => void; onPaid: (r: PayActionResult) => void };

const newKey = () => `scan-${crypto.randomUUID()}`;

/**
 * Piccola cassa di un pulsante a pagamento (es. "+1 Bambino" con l'ingresso bambino): prodotto e
 * prezzo arrivano dal server, si sceglie contanti o carta POS e si conferma. Serve la rete.
 */
export function PayActionDialog({ orderId, action, onClose, onPaid }: Props) {
  const [quote, setQuote] = useState<ActionQuote | null>(null);
  const [error, setError] = useState<{ text: string; offline?: boolean } | null>(null);
  const [method, setMethod] = useState<Method>('cash');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PayActionResult | null>(null);
  // Una chiave per apertura: se la rete cade dopo l'invio, "Riprova" non incassa due volte.
  const [key] = useState(newKey);

  useEffect(() => {
    let alive = true;
    api<ActionQuote>(`action?${qs({ orderId, actionKey: action.key })}`, { timeoutMs: 6000 })
      .then((q) => alive && setQuote(q))
      .catch((e) => alive && setError(failure(e)));
    return () => {
      alive = false;
    };
  }, [orderId, action.key]);

  const confirm = async () => {
    if (!quote?.paid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<PayActionResult>('action', {
        method: 'POST',
        body: { orderId, actionKey: action.key, method, idempotencyKey: key, expectedTotalCents: quote.product.priceCents },
        timeoutMs: 10_000,
      });
      setDone(r);
      onPaid(r);
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };

  const blocked = quote?.paid ? quote.problem : null;
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        size="sm"
        title={done ? 'Incassato' : action.label}
        description={done ? undefined : 'Incassa e aggiungi al conteggio dell’ordine.'}
        footer={
          done ? (
            <Button onClick={onClose}>Fatto</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                Annulla
              </Button>
              <Button onClick={confirm} disabled={!quote?.paid || !!blocked || busy} loading={busy}>
                {quote?.paid ? `Incassa ${formatMoney(quote.product.priceCents)}` : 'Incassa'}
              </Button>
            </>
          )
        }
      >
        {done ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 size={40} className="text-success" aria-hidden />
            <p className="text-section font-semibold text-fg">{done.sale ? formatMoney(done.sale.totalCents) : 'Contato'}</p>
            <p className="text-body text-muted">
              {done.sale ? `${done.sale.method === 'cash' ? 'Contanti' : 'Carta POS'} · ${done.sale.register} · vendita ${done.sale.number ?? done.sale.code}` : 'Prodotto gratuito: solo conteggio.'}
            </p>
            <p className="text-body text-fg">
              {done.label}: ora {done.after}
            </p>
          </div>
        ) : !quote && !error ? (
          <div className="flex justify-center py-6">
            <Loader2 aria-label="Caricamento" className="animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {quote?.paid && (
              <div className="flex items-baseline justify-between gap-3 rounded-lg bg-surface-sunken px-4 py-3">
                <span className="text-body font-medium text-fg">{quote.product.name}</span>
                <span className="text-section font-semibold text-fg tabular-nums">{formatMoney(quote.product.priceCents)}</span>
              </div>
            )}
            {quote?.paid && !blocked && (
              <div role="radiogroup" aria-label="Metodo di pagamento" className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['cash', 'Contanti', Banknote],
                    ['card_pos', 'Carta POS', CreditCard],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={method === m}
                    onClick={() => setMethod(m)}
                    className={cn('flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 text-body font-semibold', method === m ? 'border-primary bg-primary/10 text-fg' : 'border-border text-muted', focusRing)}
                  >
                    <Icon size={22} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            )}
            {quote?.paid && quote.register && !blocked && <p className="text-label text-muted">Incasso sul turno della cassa «{quote.register}».</p>}
            {quote && !quote.paid && <p className="text-body text-muted">Questo pulsante non incassa più: chiudi e tocca di nuovo per contare.</p>}
            {(blocked || error) && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-body text-danger">
                {error?.offline && <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden />}
                {blocked ?? error?.text}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function failure(e: unknown): { text: string; offline?: boolean } {
  if (e instanceof NetworkError) return { text: 'Serve la connessione per incassare: senza rete il pagamento non si registra. Riprova quando torna il segnale.', offline: true };
  return { text: e instanceof Error ? e.message : 'Incasso non riuscito.' };
}
