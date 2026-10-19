'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState, Input, Sheet, SheetContent, Skeleton } from '@/components/ui';
import { api, qs } from './api';
import type { SearchOrder } from './types';

const time = (iso: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso));

/** Ricerca manuale per chi non ha il QR: per nome o codice ordine, poi "Fai entrare" sul biglietto. */
export function SearchSheet({ listId, initial, onClose, onCheckIn }: { listId: string; initial: string; onClose: () => void; onCheckIn: (ticketId: string) => void }) {
  const [q, setQ] = useState(initial);
  const [orders, setOrders] = useState<SearchOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  }, [q, listId]);

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
                    {!o.admitted && <Badge tone="danger">Non valido</Badge>}
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
                          <Badge tone="warning">Entrato {time(t.enteredAt)}</Badge>
                        ) : (
                          <Button size="sm" disabled={!o.admitted || !t.inList} onClick={() => onCheckIn(t.id)}>
                            Fai entrare
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
      </SheetContent>
    </Sheet>
  );
}
