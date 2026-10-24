'use client';

import { ArrowLeft, Banknote, CreditCard, Gift } from 'lucide-react';
import { useState } from 'react';
import { cn, focusRing, Textarea } from '@/components/ui';
import { changeFor, quickAmounts } from '@/lib/cash/change';
import { METHOD_LABEL, type PayMethod } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import { BigButton, MoneyKeypad } from './Keypad';

const METHODS: Array<{ id: PayMethod; icon: typeof Banknote }> = [
  { id: 'cash', icon: Banknote },
  { id: 'card_pos', icon: CreditCard },
  { id: 'complimentary', icon: Gift },
];

export type PaymentChoice = { method: PayMethod; cashReceivedCents: number | null; complimentaryReason: string | null };

type Props = {
  totalCents: number;
  busy: boolean;
  error: string;
  /** Omaggi permessi a chi usa la cassa (pos.complimentary). */
  allowComplimentary?: boolean;
  backLabel?: string;
  onBack: () => void;
  onConfirm: (choice: PaymentChoice) => void;
};

/**
 * Pagamento (§12.1 punto 5): contanti con tastierino, importi rapidi e resto; carta sul POS della
 * Pro Loco; omaggio con il motivo. Si registra un contributo, non uno scontrino.
 */
export function Payment({ totalCents, busy, error, allowComplimentary = true, backLabel = 'Torna al carrello', onBack, onConfirm }: Props) {
  const methods = allowComplimentary ? METHODS : METHODS.filter((m) => m.id !== 'complimentary');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [received, setReceived] = useState(0);
  const [reason, setReason] = useState('');
  const change = changeFor(totalCents, received);
  const cashOk = received === 0 || change !== null;
  const reasonOk = reason.trim().length >= 3;
  const canConfirm = !busy && (method === 'cash' ? cashOk : method === 'complimentary' ? reasonOk : true);

  function confirm() {
    if (!canConfirm) return;
    onConfirm({
      method,
      cashReceivedCents: method === 'cash' && received > 0 ? received : null,
      complimentaryReason: method === 'complimentary' ? reason.trim() : null,
    });
  }

  return (
    <div className="mx-auto w-full max-w-md pb-6">
      <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-1 text-body text-muted">
        <ArrowLeft size={18} aria-hidden /> {backLabel}
      </button>
      <p className="text-body text-muted">Da incassare</p>
      <p className="mb-4 text-[2.5rem] leading-tight font-bold tabular-nums">{formatMoney(totalCents)}</p>

      <div className={cn('mb-4 grid gap-2', methods.length === 3 ? 'grid-cols-3' : 'grid-cols-2')} role="radiogroup" aria-label="Metodo di pagamento">
        {methods.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={method === id}
            onClick={() => setMethod(id)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-label font-semibold',
              method === id ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg',
              focusRing,
            )}
          >
            <Icon size={22} aria-hidden />
            {METHOD_LABEL[id]}
          </button>
        ))}
      </div>

      {method === 'cash' && (
        <>
          <div className="mb-2 grid grid-cols-4 gap-2">
            {quickAmounts(totalCents).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setReceived(a)}
                className={cn('min-h-12 rounded-xl border border-border bg-surface text-label font-semibold tabular-nums', received === a && 'border-primary ring-2 ring-primary', focusRing)}
              >
                {a === totalCents ? 'Esatto' : formatMoney(a).replace(',00', '')}
              </button>
            ))}
          </div>
          <MoneyKeypad value={received} onChange={setReceived} label="Contanti ricevuti" />
          <p className="mt-3 flex items-baseline justify-between rounded-xl bg-success-bg px-4 py-3" aria-live="polite">
            <span className="text-body">{received === 0 ? 'Importo esatto' : change === null ? 'Non basta' : 'Resto da dare'}</span>
            <span className={cn('text-title font-bold tabular-nums', change === null && received > 0 && 'text-danger')}>
              {received === 0 ? '—' : change === null ? formatMoney(received - totalCents) : formatMoney(change)}
            </span>
          </p>
        </>
      )}

      {method === 'card_pos' && <p className="rounded-xl border border-border bg-surface p-4 text-body">Fai pagare {formatMoney(totalCents)} sul POS e conferma solo dopo che lo scontrino del POS è uscito.</p>}

      {method === 'complimentary' && (
        <div>
          <label htmlFor="omaggio-motivo" className="mb-1 block text-label font-medium">
            Motivo dell’omaggio
          </label>
          <Textarea id="omaggio-motivo" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Es. pasto dei volontari, ospite della Pro Loco" />
          <div className="mt-2 flex flex-wrap gap-2">
            {['Volontari', 'Ospite', 'Sponsor', 'Prodotto sostituito'].map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn('min-h-11 rounded-full border border-border bg-surface px-3 text-label', focusRing)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-bg p-3 text-body text-danger">
          {error}
        </p>
      )}
      <BigButton className="mt-4" onClick={confirm} disabled={!canConfirm}>
        {busy ? 'Registrazione…' : method === 'complimentary' ? 'Registra omaggio' : 'Conferma contributo'}
      </BigButton>
    </div>
  );
}
