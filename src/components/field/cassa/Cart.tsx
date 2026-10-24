'use client';

import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { cn, focusRing } from '@/components/ui';
import type { PosCatalog } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import { BigButton } from './Keypad';
import { lineInfo, type CartLine } from './useSaleQueue';

type Props = {
  catalog: PosCatalog;
  cart: CartLine[];
  totalCents: number;
  onChange: (productId: string, quantity: number) => void;
  onClear: () => void;
  onPay: () => void;
};

/** Righe del carrello con più/meno. */
export function CartLines({ catalog, cart, onChange }: Pick<Props, 'catalog' | 'cart' | 'onChange'>) {
  if (cart.length === 0) {
    return (
      <p className="flex items-center gap-2 py-6 text-body text-muted">
        <ShoppingCart size={18} aria-hidden /> Tocca un prodotto per aggiungerlo.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {cart.map((l) => {
        const p = lineInfo(catalog, l);
        if (!p) return null;
        const max = p.remaining ?? 50;
        return (
          <li key={l.productId} className="flex items-center gap-2 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-medium">
                {p.name}
                {l.openAmountCents !== undefined && l.quantity > 1 && <span className="font-normal text-muted"> · {formatMoney(p.priceCents)} l’uno</span>}
              </span>
              <span className="block text-label text-muted tabular-nums">{formatMoney(p.priceCents * l.quantity)}</span>
            </span>
            <QtyButton label={l.quantity === 1 ? `Togli ${p.name}` : `Uno in meno di ${p.name}`} onClick={() => onChange(l.productId, l.quantity - 1)}>
              {l.quantity === 1 ? <Trash2 size={18} aria-hidden /> : <Minus size={18} aria-hidden />}
            </QtyButton>
            <span className="w-8 text-center text-section font-semibold tabular-nums">{l.quantity}</span>
            <QtyButton label={`Uno in più di ${p.name}`} onClick={() => onChange(l.productId, l.quantity + 1)} disabled={l.quantity >= Math.min(50, max)}>
              <Plus size={18} aria-hidden />
            </QtyButton>
          </li>
        );
      })}
    </ul>
  );
}

function QtyButton({ children, onClick, label, disabled }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} disabled={disabled} className={cn('flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-40', focusRing)}>
      {children}
    </button>
  );
}

/** Carrello in colonna (tablet e computer). */
export function CartPanel({ catalog, cart, totalCents, onChange, onClear, onPay }: Props) {
  return (
    <aside aria-label="Carrello" className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-section font-semibold">Carrello</h2>
        {cart.length > 0 && (
          <button type="button" onClick={onClear} className="min-h-11 px-2 text-label text-muted hover:text-danger">
            Svuota
          </button>
        )}
      </div>
      <CartLines catalog={catalog} cart={cart} onChange={onChange} />
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-body text-muted">Totale</span>
        <span className="text-title font-bold tabular-nums">{formatMoney(totalCents)}</span>
      </div>
      <BigButton className="mt-3" onClick={onPay} disabled={cart.length === 0}>
        Incassa
      </BigButton>
    </aside>
  );
}

/** Barra in basso sul telefono: totale e Incassa; tocca il riepilogo per vedere le righe. */
export function CartBar({ cart, totalCents, onOpen, onPay }: { cart: CartLine[]; totalCents: number; onOpen: () => void; onPay: () => void }) {
  const items = cart.reduce((n, l) => n + l.quantity, 0);
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button type="button" onClick={onOpen} disabled={items === 0} className={cn('flex min-h-14 flex-1 flex-col items-start justify-center rounded-xl px-2 text-left disabled:opacity-60', focusRing)}>
          <span className="text-label text-muted">{items === 0 ? 'Carrello vuoto' : `${items} ${items === 1 ? 'prodotto' : 'prodotti'} · vedi`}</span>
          <span className="text-title font-bold tabular-nums">{formatMoney(totalCents)}</span>
        </button>
        <BigButton className="w-auto flex-1" onClick={onPay} disabled={items === 0}>
          Incassa
        </BigButton>
      </div>
    </div>
  );
}
