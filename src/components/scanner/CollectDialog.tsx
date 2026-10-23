'use client';

import { Banknote, CreditCard, Loader2, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, Select, cn, focusRing } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { api, NetworkError, qs } from './api';
import type { CollectQuote, CollectResponse } from './types';

type Method = 'cash' | 'card_pos';
type Props = {
  orderId: string;
  ticketId: string;
  listId: string;
  sessionId: string | null;
  questionKeys: string[];
  onClose: () => void;
  onCollected: (r: CollectResponse) => void;
};

const newKey = () => `incasso-${crypto.randomUUID()}`;

/**
 * Incasso al varco di un ordine "Paga in loco": importo e turni di cassa dal server, contanti o POS,
 * poi il biglietto entra. Serve la rete.
 */
export function CollectDialog({ orderId, ticketId, listId, sessionId, questionKeys, onClose, onCollected }: Props) {
  const [quote, setQuote] = useState<CollectQuote | null>(null);
  const [error, setError] = useState<{ text: string; offline?: boolean } | null>(null);
  const [method, setMethod] = useState<Method>('cash');
  const [shift, setShift] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Una chiave per apertura: se la rete cade dopo l'invio, "Riprova" non incassa due volte.
  const [key] = useState(newKey);

  useEffect(() => {
    let alive = true;
    api<CollectQuote>(`collect?${qs({ orderId })}`, { timeoutMs: 6000 })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        // Il turno di questo telefono, o l'unico aperto, si sceglie da solo.
        if (q.shifts.length === 1 || q.shifts[0]?.own) setShift(q.shifts[0].cashSessionId);
      })
      .catch((e) => alive && setError(failure(e)));
    return () => {
      alive = false;
    };
  }, [orderId]);

  const confirm = async () => {
    if (!quote || !shift) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<CollectResponse>('collect', {
        method: 'POST',
        body: { ticketId, checkinListId: listId, sessionId, cashSessionId: shift, method, idempotencyKey: key, expectedDueCents: quote.dueCents, questionKeys },
        timeoutMs: 10_000,
      });
      onCollected(r);
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };

  const blocked = quote?.problem ?? null;
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        size="sm"
        title="Incassa e fai entrare"
        description={quote ? `Ordine ${quote.code} · Paga in loco` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Annulla
            </Button>
            <Button onClick={confirm} disabled={!quote || !!blocked || !shift || busy} loading={busy}>
              {quote ? `Incassa ${formatMoney(quote.dueCents)}` : 'Incassa'}
            </Button>
          </>
        }
      >
        {!quote && !error ? (
          <div className="flex justify-center py-6">
            <Loader2 aria-label="Caricamento" className="animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {quote && (
              <div className="flex items-baseline justify-between gap-3 rounded-lg bg-surface-sunken px-4 py-3">
                <span className="text-body font-medium text-fg">Da pagare</span>
                <span className="text-section font-semibold text-fg tabular-nums">{formatMoney(quote.dueCents)}</span>
              </div>
            )}
            {quote && !blocked && (
              <>
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
                {quote.shifts.length > 1 ? (
                  <Select
                    aria-label="Turno di cassa"
                    placeholder="Su quale cassa incassi?"
                    value={shift ?? undefined}
                    onValueChange={setShift}
                    options={quote.shifts.map((s) => ({ value: s.cashSessionId, label: s.register }))}
                  />
                ) : (
                  <p className="text-label text-muted">Incasso sul turno della cassa «{quote.shifts[0]?.register}».</p>
                )}
                {method === 'card_pos' && <p className="text-label text-muted">Conferma solo dopo che lo scontrino del POS è uscito.</p>}
              </>
            )}
            {(blocked || error) && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-body text-danger">
                {error?.offline && <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden />}
                {error?.text ?? blocked}
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
