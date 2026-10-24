'use client';

import { ChefHat, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn, EmptyState, ErrorState, focusRing, ForbiddenState, Skeleton } from '@/components/ui';
import { FieldGate, type FieldSession } from '@/components/field/FieldGate';
import { CassaError, cassaFetch } from '@/lib/cash/types';
import { makeApi } from './api';
import { Shell } from './CassaApp';

type Status = 'pending' | 'preparing' | 'ready' | 'delivered';
type Ticket = { orderId: string; number: number | null; code: string; at: string; status: Status; lines: Array<{ name: string; quantity: number }> };

const COLUMNS: Array<{ id: Status; label: string; next?: Status; action?: string }> = [
  { id: 'pending', label: 'Da preparare', next: 'preparing', action: 'Inizia' },
  { id: 'preparing', label: 'In preparazione', next: 'ready', action: 'Pronta' },
  { id: 'ready', label: 'Pronte', next: 'delivered', action: 'Consegnata' },
  { id: 'delivered', label: 'Consegnate' },
];
const PREV: Partial<Record<Status, Status>> = { preparing: 'pending', ready: 'preparing', delivered: 'ready' };

/** Schermo del reparto (§12.2): comande da preparare → in preparazione → pronte → consegnate. */
export function DepartmentBoard({ department, adminEdition }: { department: string; adminEdition: string | null }) {
  return (
    <FieldGate kind="pos" posHref="/cassa" allowLegacyCode={false}>
      {(session) => <Board session={session} department={department} adminEdition={session.device ? null : adminEdition} />}
    </FieldGate>
  );
}

function Board({ session, department, adminEdition }: { session: FieldSession; department: string; adminEdition: string | null }) {
  const api = useMemo(() => makeApi(adminEdition), [adminEdition]);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<{ message: string; forbidden: boolean } | null>(null);
  const [tab, setTab] = useState<Status>('pending');

  const load = useCallback(async () => {
    try {
      setTickets((await cassaFetch<{ tickets: Ticket[] }>(api('reparto', { reparto: department }))).tickets);
      setError(null);
    } catch (e) {
      const err = e as CassaError;
      setError({ message: err.message, forbidden: err.status === 403 });
    }
  }, [api, department]);

  useEffect(() => {
    load();
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(api('stream', { reparto: department }));
    es.addEventListener('tickets', (ev) => {
      try {
        setTickets(JSON.parse((ev as MessageEvent).data) as Ticket[]);
      } catch {
        // si aspetta il prossimo aggiornamento
      }
    });
    return () => es.close();
  }, [api, department, load]);

  if (!session.device && !adminEdition) {
    return (
      <Shell>
        <EmptyState icon={ChefHat} title="Apri lo schermo dall’admin dell’edizione" description="Sui tablet della cucina serve un dispositivo di cassa abbinato." />
      </Shell>
    );
  }
  if (error?.forbidden) return <Shell><ForbiddenState /></Shell>;
  if (error && !tickets) return <Shell><ErrorState message={error.message} onRetry={load} /></Shell>;

  async function move(t: Ticket, status: Status) {
    setTickets((all) => all?.map((x) => (x.orderId === t.orderId ? { ...x, status } : x)) ?? null);
    try {
      await cassaFetch(api('reparto'), { method: 'POST', body: JSON.stringify({ orderId: t.orderId, department, status }) });
    } catch (e) {
      setError({ message: (e as CassaError).message, forbidden: false });
      load();
    }
  }

  return (
    <div className="ui-root min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3">
        <h1 className="text-title font-semibold">Reparto {department}</h1>
        {error && <p role="alert" className="text-label text-danger">{error.message}</p>}
      </header>
      <div className="flex gap-2 overflow-x-auto px-4 pt-3 md:hidden" role="tablist" aria-label="Colonne">
        {COLUMNS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)} className={cn('min-h-11 shrink-0 rounded-full border px-4 text-body', tab === c.id ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface', focusRing)}>
            {c.label} ({tickets?.filter((t) => t.status === c.id).length ?? 0})
          </button>
        ))}
      </div>
      <main className="grid gap-3 p-4 md:grid-cols-4">
        {COLUMNS.map((c) => {
          const list = (tickets ?? []).filter((t) => t.status === c.id);
          const shown = c.id === 'delivered' ? list.slice(-8).reverse() : list;
          return (
            <section key={c.id} aria-label={c.label} className={cn('flex-col gap-2', tab === c.id ? 'flex' : 'hidden md:flex')}>
              <h2 className="hidden text-section font-semibold md:block">
                {c.label} <span className="text-muted">({list.length})</span>
              </h2>
              {!tickets ? (
                <Skeleton className="h-28 rounded-xl" />
              ) : shown.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-body text-muted">Nessuna comanda</p>
              ) : (
                shown.map((t) => (
                  <article key={t.orderId} className={cn('rounded-xl border bg-surface p-3', c.id === 'ready' ? 'border-success' : 'border-border')}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[2rem] leading-none font-black tabular-nums">{t.number ?? t.code}</span>
                      <span className="text-label text-muted">{new Date(t.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <ul className="mt-2 text-section">
                      {t.lines.map((l, i) => (
                        <li key={i}>
                          <strong className="tabular-nums">{l.quantity}×</strong> {l.name}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      {PREV[t.status] && (
                        <button type="button" onClick={() => move(t, PREV[t.status]!)} aria-label="Torna indietro" className={cn('flex h-14 w-14 items-center justify-center rounded-xl border border-border', focusRing)}>
                          <Undo2 size={20} aria-hidden />
                        </button>
                      )}
                      {c.next && (
                        <button type="button" onClick={() => move(t, c.next!)} className={cn('min-h-14 flex-1 rounded-xl bg-primary text-section font-semibold text-primary-fg', focusRing)}>
                          {c.action}
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}

