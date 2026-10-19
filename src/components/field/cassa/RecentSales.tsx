'use client';

import { ArrowLeft, History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, EmptyState, ErrorState, Input, Select, Skeleton, Textarea } from '@/components/ui';
import { CassaError, cassaFetch, type CassaState, type RecentSale } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import type { ApiFn } from './api';

type Props = { api: ApiFn; sessionId: string; state: CassaState; onBack: () => void };

/** Ultime vendite del turno, con l'annullo autorizzato da un responsabile (§12.1). */
export function RecentSales({ api, sessionId, state, onBack }: Props) {
  const [sales, setSales] = useState<RecentSale[] | null>(null);
  const [error, setError] = useState('');
  const [voiding, setVoiding] = useState<RecentSale | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await cassaFetch<{ sales: RecentSale[] }>(api('sales', { turno: sessionId }));
      setSales(r.sales);
      setError('');
    } catch (e) {
      setError((e as CassaError).message);
    }
  }, [api, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-1 text-body text-muted">
        <ArrowLeft size={18} aria-hidden /> Torna alla vendita
      </button>
      <h2 className="mb-3 text-title font-semibold">Ultime vendite del turno</h2>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !sales ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <EmptyState icon={History} title="Ancora nessuna vendita in questo turno" />
      ) : (
        <ul className="flex flex-col gap-2">
          {sales.map((s) => (
            <li key={s.orderId} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="w-14 shrink-0 text-center text-title font-bold tabular-nums">{s.number ?? '—'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body">{s.summary}</span>
                <span className="block text-label text-muted">
                  {new Date(s.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {formatMoney(s.totalCents)}
                </span>
              </span>
              {s.voided ? (
                <span className="text-label font-semibold text-danger">Annullata</span>
              ) : (
                <Button variant="secondary" size="lg" onClick={() => setVoiding(s)}>
                  Annulla
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {voiding && <VoidDialog api={api} sale={voiding} sessionId={sessionId} state={state} onClose={() => setVoiding(null)} onDone={load} />}
    </div>
  );
}

function VoidDialog({ api, sale, sessionId, state, onClose, onDone }: { api: ApiFn; sale: RecentSale; sessionId: string; state: CassaState; onClose: () => void; onDone: () => void }) {
  // Dall'admin (senza dispositivo) chi ha pos.void annulla senza PIN; dal telefono serve un responsabile.
  const needsPin = state.device !== null;
  const [manager, setManager] = useState(state.managers.length === 1 ? state.managers[0].id : '');
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = reason.trim().length >= 3 && (!needsPin || (manager && /^\d{4,6}$/.test(pin)));

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await cassaFetch(api(`sales/${sale.orderId}/void`), {
        method: 'POST',
        body: JSON.stringify({ reason, cashSessionId: sessionId, ...(needsPin ? { managerUserId: manager, managerPin: pin } : {}) }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError((e as CassaError).message);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Annullare l’ordine ${sale.number ?? sale.code}?`}
        description={`${formatMoney(sale.totalCents)} tornano al cliente con lo stesso metodo. L’annullo resta nel registro.`}
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Non annullare
            </Button>
            <Button variant="danger" size="lg" onClick={submit} disabled={!ok} loading={busy}>
              Annulla ordine
            </Button>
          </>
        }
      >
        {needsPin &&
          (state.managers.length === 0 ? (
            <p className="mb-3 text-body text-danger">Nessun responsabile può autorizzare annulli in questa edizione: serve il ruolo con il permesso di annullo e un PIN.</p>
          ) : (
            <div className="mb-3 grid gap-3">
              <div>
                <label className="mb-1 block text-label font-medium" htmlFor="void-manager">
                  Responsabile
                </label>
                <Select id="void-manager" value={manager} onValueChange={setManager} options={state.managers.map((m) => ({ value: m.id, label: m.name }))} />
              </div>
              <div>
                <label className="mb-1 block text-label font-medium" htmlFor="void-pin">
                  PIN del responsabile
                </label>
                <Input id="void-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          ))}
        <label className="mb-1 block text-label font-medium" htmlFor="void-reason">
          Motivo
        </label>
        <Textarea id="void-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Es. prodotto sbagliato, cliente ha cambiato idea" />
        {error && (
          <p role="alert" className="mt-2 text-body text-danger">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
