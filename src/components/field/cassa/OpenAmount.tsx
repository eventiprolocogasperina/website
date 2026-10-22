'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { isValidOpenAmount, OPEN_PRICE_NAME } from '@/lib/cash/open-price';
import { formatMoney } from '@/lib/money';
import { BigButton, MoneyKeypad } from './Keypad';

type Props = { maxCents: number; onBack: () => void; onAdd: (cents: number) => void };

/**
 * "Altro": il cassiere digita un importo libero (es. un'offerta o un prodotto che non è nel listino)
 * e lo aggiunge al carrello come una riga. Il server accetta l'importo solo dalla cassa, fino a 1000 €.
 */
export function OpenAmount({ maxCents, onBack, onAdd }: Props) {
  const [cents, setCents] = useState(0);
  const tooMuch = cents > maxCents;
  const ok = isValidOpenAmount(cents) && !tooMuch;

  return (
    <div className="mx-auto w-full max-w-md pb-6">
      <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-1 text-body text-muted">
        <ArrowLeft size={18} aria-hidden /> Torna ai prodotti
      </button>
      <h2 className="text-title font-semibold">{OPEN_PRICE_NAME}</h2>
      <p className="mb-4 text-body text-muted">Digita l’importo da aggiungere al carrello, fino a {formatMoney(maxCents)}.</p>
      <MoneyKeypad value={cents} onChange={setCents} label="Importo" />
      {tooMuch && (
        <p role="alert" className="mt-3 rounded-xl bg-danger-bg p-3 text-body text-danger">
          L’importo supera {formatMoney(maxCents)}, il massimo per una riga. Correggilo o chiedi a un responsabile.
        </p>
      )}
      <BigButton className="mt-4" onClick={() => ok && onAdd(cents)} disabled={!ok}>
        Aggiungi {cents > 0 ? formatMoney(cents) : ''} al carrello
      </BigButton>
    </div>
  );
}
