'use client';

import { Search, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState, Input, Sheet, SheetContent, Skeleton } from '@/components/ui';
import { api, qs } from './api';
import { RevertCheckinDialog, type RevertTarget } from './RevertCheckinDialog';
import type { SearchOrder } from './types';

const time = (iso: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso));

type Props = { listId: string; initial: string; onClose: () => void; onCheckIn: (ticketId: string) => void; onRevert: ((checkinId: string) => Promise<unknown>) | null };

/**
 * Ricerca manuale per chi non ha il QR: per nome o codice ordine, poi "Fai entrare" sul biglietto.
 * Su un biglietto già entrato, "Annulla ingresso" (con conferma) lo rende di nuovo valido.
 */
export function SearchSheet({ listId, initial, onClose, onCheckIn, onRevert }: Props) {
  const [q, setQ] = useState(initial);
  const [orders, setOrders] = useState<SearchOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState<RevertTarget | null>(null);
  /** Cresce dopo un annullo: rilancia la ricerca per mostrare il biglietto di nuovo valido. */
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let stale = false;
    const id = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api<{ orders: SearchOrder[] }>(`search?${qs({ lista: listId, q: term })}`);
        if (!stale) setOrders(r.orders);
      } catch (e) {
        if (!stale) setError(e instanceof Error ? e.message : 'Ricerca non riuscita.');
      } finally {
        if (!stale) setLoading(false);
      }
    }, 300);
    return () => {
      stale = true;
      window.clearTimeout(id);
    };
  }, [q, listId, reload]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent title="Cerca un biglietto" description="Per nome di chi ha comprato o codice dell’ordine.">
        <div className="flex flex-col gap-4">
          <Input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Es. Rossi o ZC26-7F3K" aria-label="Nome o codice" prefix={<Search size={16} aria-hidden />} />
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
          {loading && !orders ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : q.trim().length < 2 ? (
            <p className="text-body text-muted">Scrivi almeno 2 lettere.</p>
          ) : orders && orders.length === 0 ? (
            <EmptyState icon={Search} title="Nessun ordine trovato" description="Controlla il nome o chiedi il codice dell’ordine (nell’email di conferma)." />
          ) : (
            <ul className="flex flex-col gap-3">
              {orders?.map((o) => (
                <li key={o.orderId} className="rounded-xl border border-border bg-surface p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{o.holderName ?? 'Senza nome'}</p>
                      <p className="text-label text-muted">{o.code}</p>
                    </div>
                    {o.toPay ? <Badge tone="warning">Da pagare</Badge> : !o.admitted && <Badge tone="danger">Non valido</Badge>}
                  </div>
                  <ul className="divide-y divide-border">
                    {o.tickets.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0 text-body">
                          <p className="truncate">{t.productName}</p>
                          <p className="text-label text-muted">
                            {t.validOn ?? 'Ogni giorno'}
                            {!t.inList && ' · non in questa lista'}
                          </p>
                        </div>
                        {t.enteredAt ? (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge tone="warning">Entrato {time(t.enteredAt)}</Badge>
                            {t.checkinId && onRevert && (
                              <Button size="sm" variant="secondary" icon={Undo2} onClick={() => setReverting({ checkinId: t.checkinId!, what: `${t.productName} · ${o.code}`, at: t.enteredAt! })}>
                                Annulla ingresso
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button size="sm" disabled={!(o.admitted || o.toPay) || !t.inList} onClick={() => onCheckIn(t.id)}>
                            {o.toPay ? 'Da pagare' : 'Fai entrare'}
                          </Button>
                        )}
                      </li>
                    ))}
                    {o.tickets.length === 0 && <li className="py-2 text-label text-muted">Nessun biglietto valido.</li>}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        <RevertCheckinDialog
          target={reverting}
          onClose={() => setReverting(null)}
          onRevert={async (id) => {
            setError(null);
            await onRevert?.(id);
            setReload((n) => n + 1);
          }}
          onError={setError}
        />
      </SheetContent>
    </Sheet>
  );
}
