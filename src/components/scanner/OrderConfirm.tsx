'use client';

import { Check, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn, focusRing } from '@/components/ui';
import { stateReason } from './present';
import type { OfflineGroupTicket, OrderTicketJson } from './types';

type Row = { id: string; title: string; holder: string | null; reason: string | null; scanned: boolean };

type Props = {
  /** Biglietti dell'ordine: online dal server, offline dall'elenco scaricato. */
  order: { source: 'online'; code: string; holderName: string | null; scannedId: string; tickets: OrderTicketJson[] } | { source: 'offline'; tickets: OfflineGroupTicket[] };
  busy: boolean;
  onConfirm: (ticketIds: string[]) => Promise<unknown>;
  onClose: () => void;
};

function rows(order: Props['order']): Row[] {
  if (order.source === 'offline')
    return order.tickets.map((t) => ({ id: t.ticketId, title: `${t.productName}${t.validOn ? ` · ${t.validOn}` : ''}`, holder: null, reason: t.state === 'ready' ? null : stateReason({ state: t.state, validOn: t.validOn }), scanned: t.scanned }));
  return order.tickets.map((t) => ({
    id: t.id,
    title: `${t.productName}${t.validOn ? ` · ${t.validOn}` : ''}`,
    holder: t.holderName && t.holderName !== order.holderName ? t.holderName : null,
    reason: stateReason(t),
    scanned: t.id === order.scannedId,
  }));
}

/**
 * Conferma dell'ordine letto dal QR: tutti i biglietti dell'ordine, quelli che possono entrare già
 * spuntati. L'operatore toglie chi non c'è e tocca "Fai entrare N". Gli altri sono grigi con il motivo.
 */
export function OrderConfirm({ order, busy, onConfirm, onClose }: Props) {
  const list = rows(order);
  const [chosen, setChosen] = useState(() => new Set(list.filter((r) => !r.reason).map((r) => r.id)));
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const n = chosen.size;
  const toggle = (id: string) =>
    setChosen((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ordine-titolo" className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="bg-success px-6 pt-6 pb-4 text-bg">
        <p className="flex items-center gap-2 text-label font-semibold tracking-wide uppercase">
          <Users size={18} aria-hidden /> Conferma ingresso
        </p>
        <h2 id="ordine-titolo" className="mt-1 text-3xl leading-tight font-bold break-words">
          {order.source === 'online' ? (order.holderName ?? `Ordine ${order.code}`) : 'Ordine (offline)'}
        </h2>
        <p className="text-body opacity-90">{order.source === 'online' ? `Ordine ${order.code} · ${list.length} ${list.length === 1 ? 'biglietto' : 'biglietti'}` : 'Senza rete: nomi e codice non sono nell’elenco scaricato.'}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="mx-auto mb-3 max-w-md text-body text-muted">Controlla che ci siano tutti. Togli la spunta a chi non è presente.</p>
        <ul className="mx-auto flex max-w-md flex-col gap-2">
          {list.map((r) => {
            const on = chosen.has(r.id);
            const disabled = !!r.reason;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-disabled={disabled}
                  disabled={disabled || busy}
                  onClick={() => toggle(r.id)}
                  className={cn(
                    'flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left',
                    disabled ? 'border-border bg-surface-sunken text-muted' : on ? 'border-success bg-success-bg text-fg' : 'border-border bg-surface text-fg',
                    focusRing,
                  )}
                >
                  <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-md border-2', disabled ? 'border-border' : on ? 'border-success bg-success text-bg' : 'border-border-strong')}>
                    {on && !disabled && <Check size={18} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-section font-semibold', disabled && 'line-through decoration-1')}>{r.title}</span>
                    {r.holder && <span className="block text-body">{r.holder}</span>}
                    {r.reason && <span className="block text-label">{r.reason}</span>}
                    {r.scanned && !r.reason && <span className="block text-label text-muted">QR letto</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pb-6">
        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body text-danger">
            {error}
          </p>
        )}
        <button
          ref={confirmRef}
          type="button"
          disabled={!n || busy}
          onClick={async () => {
            setError(null);
            try {
              await onConfirm(list.filter((r) => chosen.has(r.id)).map((r) => r.id));
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Ingresso non riuscito. Riprova.');
            }
          }}
          className={cn('min-h-16 rounded-xl bg-success text-title font-bold text-bg disabled:opacity-50', focusRing)}
        >
          {busy ? 'Un momento…' : n ? `Fai entrare ${n}` : 'Nessuno selezionato'}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className={cn('min-h-12 rounded-xl border-2 border-border text-section font-semibold text-fg', focusRing)}>
          Non entra nessuno
        </button>
      </div>
    </div>
  );
}
