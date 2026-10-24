'use client';

import { Calculator, PackageOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, EmptyState, focusRing } from '@/components/ui';
import { OPEN_PRICE_NAME } from '@/lib/cash/open-price';
import { isLowStock, piecesLeft, stockLabel } from '@/lib/cash/stock';
import type { PosProduct } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';

const ALL = '__tutti__';


type Props = {
  products: PosProduct[];
  inCart: Record<string, number>;
  onAdd: (p: PosProduct) => void;
  /** Pulsante "Altro" (importo libero), in fondo alla griglia di ogni gruppo. Assente se spento. */
  onOther?: () => void;
};

/** Griglia dei prodotti per gruppo (reparto o tipo): i pezzi rimasti su ogni pulsante, in rosso gli ultimi, spenti gli esauriti. */
export function ProductGrid({ products, inCart, onAdd, onOther }: Props) {
  const groups = useMemo(() => [...new Set(products.map((p) => p.group))], [products]);
  const [group, setGroup] = useState(ALL);
  const shown = group === ALL ? products : products.filter((p) => p.group === group);

  if (products.length === 0 && !onOther) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Nessun prodotto in vendita su questa cassa"
        description="Dall’admin, in Catalogo, attiva il canale Cassa sui prodotti; in Cassa › Prodotti per cassa scegli cosa vende questa cassa."
      />
    );
  }

  return (
    <div>
      {groups.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Gruppi di prodotti">
          {[ALL, ...groups].map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
              className={cn(
                'min-h-11 shrink-0 rounded-full border px-4 text-body font-medium',
                group === g ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg',
                focusRing,
              )}
            >
              {g === ALL ? 'Tutti' : g}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const left = piecesLeft(p.remaining, inCart[p.id] ?? 0);
          const soldOut = left === 0;
          const few = isLowStock(left);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onAdd(p)}
                disabled={soldOut || !p.active}
                className={cn(
                  'relative flex min-h-20 w-full flex-col items-start justify-between gap-1 rounded-xl border border-border bg-surface p-3 text-left active:bg-surface-sunken disabled:opacity-50',
                  focusRing,
                )}
              >
                <span className="line-clamp-2 text-body font-semibold">
                  {p.icon && <span aria-hidden>{p.icon} </span>}
                  {p.name}
                </span>
                <span className="flex w-full items-end justify-between gap-1">
                  <span className="text-body tabular-nums">{formatMoney(p.priceCents)}</span>
                  {left !== null && (
                    <span data-testid="pezzi-rimasti" className={cn('text-caption tabular-nums', few ? 'font-semibold text-danger' : 'text-muted')}>
                      {stockLabel(left)}
                    </span>
                  )}
                </span>
                {inCart[p.id] ? (
                  <span className="absolute -top-2 -right-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1 text-label font-bold text-primary-fg" aria-label={`${inCart[p.id]} nel carrello`}>
                    {inCart[p.id]}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {onOther && (
          <li>
            <button
              type="button"
              onClick={onOther}
              className={cn('flex min-h-20 w-full flex-col items-start justify-between gap-1 rounded-xl border border-dashed border-border-strong bg-surface p-3 text-left active:bg-surface-sunken', focusRing)}
            >
              <span className="flex items-center gap-1 text-body font-semibold">
                <Calculator size={18} aria-hidden /> {OPEN_PRICE_NAME}
              </span>
              <span className="text-label text-muted">Importo libero</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
