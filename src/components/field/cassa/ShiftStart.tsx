'use client';

import { ArrowLeft, Store } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/ui';
import { CassaError, cassaFetch, type CassaState } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import type { ApiFn } from './api';
import { BigButton, MoneyKeypad } from './Keypad';

type Register = CassaState['registers'][number];

/**
 * Scelta della cassa e apertura del turno con il fondo cassa (§12.1 punti 1-2). Se la cassa ha già un
 * turno aperto (un altro telefono) si entra in quello: un cassetto, un turno.
 */
export function ShiftStart({ api, state, onReady, offline }: { api: ApiFn; state: CassaState; onReady: (registerId: string, sessionId: string) => void; offline: boolean }) {
  const [chosen, setChosen] = useState<Register | null>(null);
  const [floatCents, setFloatCents] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (state.registers.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="Nessuna cassa attiva"
        description="Un responsabile deve creare almeno una cassa dall’admin, in Cassa › Casse."
      />
    );
  }

  async function open() {
    if (!chosen) return;
    setBusy(true);
    setError('');
    try {
      const r = await cassaFetch<{ sessionId: string }>(api('sessions'), { method: 'POST', body: JSON.stringify({ registerId: chosen.id, openingFloatCents: floatCents }) });
      onReady(chosen.id, r.sessionId);
    } catch (e) {
      setError((e as CassaError).message);
    } finally {
      setBusy(false);
    }
  }

  if (chosen && !chosen.openSession) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <button type="button" onClick={() => setChosen(null)} className="mb-3 flex min-h-11 items-center gap-1 text-body text-muted">
          <ArrowLeft size={18} aria-hidden /> Cambia cassa
        </button>
        <h2 className="text-title font-semibold">Apri il turno di {chosen.name}</h2>
        <p className="mt-1 mb-4 text-body text-muted">Conta i contanti nel cassetto prima di iniziare e scrivi il fondo cassa.</p>
        <MoneyKeypad value={floatCents} onChange={setFloatCents} label="Fondo cassa" />
        {error && (
          <p role="alert" className="mt-3 text-body text-danger">
            {error}
          </p>
        )}
        <BigButton className="mt-4" onClick={open} disabled={busy || offline}>
          {busy ? 'Apertura…' : `Apri il turno con ${formatMoney(floatCents)}`}
        </BigButton>
        {offline && <p className="mt-2 text-label text-muted">Per aprire un turno serve la rete.</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="mb-1 text-title font-semibold">Su quale cassa lavori?</h2>
      <p className="mb-4 text-body text-muted">{state.edition.title}</p>
      <ul className="flex flex-col gap-2">
        {state.registers.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => (r.openSession ? onReady(r.id, r.openSession.id) : setChosen(r))}
              disabled={!r.openSession && !state.canClose}
              className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:bg-surface-sunken disabled:opacity-60"
            >
              <span>
                <span className="block text-section font-semibold">{r.name}</span>
                <span className="block text-label text-muted">
                  {r.openSession
                    ? `Turno aperto alle ${new Date(r.openSession.openedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
                    : state.canClose
                      ? 'Turno chiuso: tocca per aprirlo'
                      : 'Turno chiuso: chiedi a un responsabile di aprirlo'}
                </span>
              </span>
              <span className="shrink-0 text-label font-semibold text-primary">{r.openSession ? 'Entra' : state.canClose ? 'Apri' : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
