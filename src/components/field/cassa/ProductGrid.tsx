'use client';

import { PackageOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn, EmptyState, focusRing } from '@/components/ui';
import type { PosProduct } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';

const ALL = '__tutti__';

/** Griglia dei prodotti per gruppo (reparto o tipo), con gli esauriti spenti e le ultime porzioni in evidenza. */
export function ProductGrid({ products, inCart, onAdd }: { products: PosProduct[]; inCart: Record<string, number>; onAdd: (p: PosProduct) => void }) {
  const groups = useMemo(() => [...new Set(products.map((p) => p.group))], [products]);
  const [group, setGroup] = useState(ALL);
  const shown = group === ALL ? products : products.filter((p) => p.group === group);

  if (products.length === 0) {
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
          const soldOut = p.remaining !== null && p.remaining - (inCart[p.id] ?? 0) <= 0;
          const few = p.remaining !== null && p.remaining > 0 && p.remaining <= 5;
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
                  {p.remaining !== null && p.remaining <= 0 ? (
                    <span className="text-caption font-semibold text-danger">Esaurito</span>
                  ) : few ? (
                    <span className="text-caption font-semibold text-warning">Ultimi {p.remaining}</span>
                  ) : null}
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
      </ul>
    </div>
  );
}
