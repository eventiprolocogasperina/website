'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ErrorState, Skeleton, Textarea } from '@/components/ui';
import { countTotal, DENOMINATIONS_CENTS, denominationLabel, isBanknote, needsDifferenceNote, type DenominationCounts } from '@/lib/cash/denominations';
import { CassaError, cassaFetch, type ProductTotal, type SessionInfo } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import type { ApiFn } from './api';
import { BigButton } from './Keypad';

type Closed = { zReportNumber: number; expectedCashCents: number; countedCashCents: number; differenceCents: number };
type Props = { api: ApiFn; sessionId: string; pendingQueue: number; onBack: () => void; onClosed: () => void };

/**
 * Chiusura del turno (§12.1 punto 8): conteggio per taglio, atteso contro contato, nota se la
 * differenza supera 1 €, chiusura Z numerata in PDF.
 */
export function CloseShift({ api, sessionId, pendingQueue, onBack, onClosed }: Props) {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [counts, setCounts] = useState<DenominationCounts>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState<Closed | null>(null);

  const load = useCallback(async () => {
    try {
      setInfo(await cassaFetch<SessionInfo>(api(`sessions/${sessionId}`)));
      setLoadError('');
    } catch (e) {
      setLoadError((e as CassaError).message);
    }
  }, [api, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (closed) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <p className="text-body text-muted">Turno chiuso</p>
        <p className="text-[3rem] font-black tabular-nums">Z n. {closed.zReportNumber}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-left text-body">
          <dt className="text-muted">Contante atteso</dt>
          <dd className="text-right tabular-nums">{formatMoney(closed.expectedCashCents)}</dd>
          <dt className="text-muted">Contante contato</dt>
          <dd className="text-right tabular-nums">{formatMoney(closed.countedCashCents)}</dd>
          <dt className="text-muted">Differenza</dt>
          <dd className="text-right font-semibold tabular-nums">{formatMoney(closed.differenceCents)}</dd>
        </dl>
        {info && <SoldProducts products={info.totals.products} />}
        <a href={api(`sessions/${sessionId}/z`)} target="_blank" rel="noopener" className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface text-section font-semibold">
          <FileText size={20} aria-hidden /> Apri il PDF della chiusura
        </a>
        <BigButton className="mt-3" onClick={onClosed}>
          Fine
        </BigButton>
      </div>
    );
  }

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!info) return <Skeleton className="mx-auto h-96 w-full max-w-md rounded-xl" />;

  const counted = countTotal(counts);
  const diff = counted - info.expectedCashCents;
  const noteNeeded = needsDifferenceNote(diff);
  const canClose = !busy && pendingQueue === 0 && (!noteNeeded || notes.trim().length >= 3);

  async function close() {
    setBusy(true);
    setError('');
    try {
      setClosed(await cassaFetch<Closed>(api(`sessions/${sessionId}`), { method: 'POST', body: JSON.stringify({ denominations: counts, notes: notes.trim() || null }) }));
      // Pezzi venduti come nella Z (totali congelati alla chiusura).
      load();
    } catch (e) {
      setError((e as CassaError).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (d: number, value: string) => {
    const n = Math.min(100_000, Math.max(0, Math.floor(Number(value.replace(/\D/g, '')) || 0)));
    setCounts((c) => ({ ...c, [String(d)]: n }));
  };

  return (
    <div className="mx-auto w-full max-w-xl pb-6">
      <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-1 text-body text-muted">
        <ArrowLeft size={18} aria-hidden /> Torna alla vendita
      </button>
      <h2 className="text-title font-semibold">Chiudi il turno di {info.registerName}</h2>
      <p className="mb-4 text-body text-muted">
        Fondo {formatMoney(info.openingFloatCents)} · {info.totals.sales} vendite · contributi {formatMoney(info.totals.netCents)}
        {info.totals.complimentaryCents > 0 && ` · omaggi ${formatMoney(info.totals.complimentaryCents)}`}
      </p>
      <h3 className="mb-2 text-section font-semibold">Conta i contanti nel cassetto</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DENOMINATIONS_CENTS.map((d) => (
          <label key={d} className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border border-border px-3 ${isBanknote(d) ? 'bg-surface' : 'bg-surface-sunken'}`}>
            <span className="text-body font-semibold">{denominationLabel(d)}</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={`Pezzi da ${denominationLabel(d)}`}
              value={counts[String(d)] ? String(counts[String(d)]) : ''}
              placeholder="0"
              onChange={(e) => set(d, e.target.value)}
              className="h-11 w-16 rounded-lg border border-border bg-bg text-center text-section tabular-nums"
            />
          </label>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-xl border border-border bg-surface p-4 text-body">
        <dt className="text-muted">Contante atteso</dt>
        <dd className="text-right tabular-nums">{formatMoney(info.expectedCashCents)}</dd>
        <dt className="text-muted">Contante contato</dt>
        <dd className="text-right tabular-nums">{formatMoney(counted)}</dd>
        <dt className="font-semibold">Differenza</dt>
        <dd className={`text-right font-bold tabular-nums ${noteNeeded ? 'text-danger' : ''}`} aria-live="polite">
          {formatMoney(diff)}
        </dd>
      </dl>
      {info.totals.byMethod.some((m) => m.method !== 'cash' && m.count > 0) && (
        <p className="mt-2 text-label text-muted">
          {info.totals.byMethod
            .filter((m) => m.method !== 'cash' && m.count > 0)
            .map((m) => `${m.label}: ${formatMoney(m.netCents)}`)
            .join(' · ')}
        </p>
      )}
      <SoldProducts products={info.totals.products} />
      <label htmlFor="close-notes" className="mt-4 mb-1 block text-label font-medium">
        Note {noteNeeded ? '(obbligatorie: la differenza supera 1 €)' : '(facoltative)'}
      </label>
      <Textarea id="close-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} invalid={noteNeeded && notes.trim().length < 3} />
      {pendingQueue > 0 && <p className="mt-3 rounded-xl bg-warning-bg p-3 text-body">Ci sono {pendingQueue} vendite in coda su questo telefono: aspetta che partano prima di chiudere.</p>}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger-bg p-3 text-body text-danger">
          {error}
        </p>
      )}
      <BigButton className="mt-4" onClick={close} disabled={!canClose}>
        {busy ? 'Chiusura…' : 'Chiudi il turno e crea la Z'}
      </BigButton>
    </div>
  );
}

/** Pezzi venduti nel turno per prodotto (senza gli annullati), con l'importo: per i conti dello stand. */
function SoldProducts({ products }: { products: ProductTotal[] }) {
  if (!products?.length) return null;
  const pieces = products.reduce((n, p) => n + p.quantity, 0);
  return (
    <section className="mt-4 rounded-xl border border-border bg-surface p-4 text-left" aria-labelledby="sold-products">
      <h3 id="sold-products" className="mb-2 flex items-baseline justify-between text-section font-semibold">
        Pezzi venduti <span className="text-label font-normal text-muted tabular-nums">{pieces} in tutto</span>
      </h3>
      <ul className="divide-y divide-border text-body">
        {products.map((p) => (
          <li key={p.productId} className="flex items-baseline gap-3 py-1.5">
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{p.quantity}×</span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="text-muted tabular-nums">{formatMoney(p.amountCents)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
