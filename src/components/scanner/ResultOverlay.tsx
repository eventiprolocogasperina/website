'use client';

import { CheckCircle2, Clock3, Plus, Undo2, XOctagon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn, focusRing } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { PayActionDialog } from './PayActionDialog';
import { present, type Tone } from './present';
import { RevertCheckinDialog, type RevertTarget } from './RevertCheckinDialog';
import { UndoBar } from './UndoBar';
import type { Outcome, ScannerSetup } from './types';

const TONE: Record<Tone, string> = {
  success: 'bg-success text-bg',
  // Giallo pieno con testo scuro in entrambi i temi: "Già entrato" deve distinguersi dal rosso a colpo d'occhio.
  warning: 'bg-scan-yellow text-scan-yellow-fg',
  danger: 'bg-danger text-bg',
};
const ICON = { success: CheckCircle2, warning: Clock3, danger: XOctagon } as const;
/** Un esito verde si chiude da solo, così la fila scorre; gli altri restano finché non tocchi. */
const AUTO_CLOSE_MS = 3500;

type Props = {
  outcome: Outcome;
  actions: ScannerSetup['actions'];
  /** false: i pulsanti a pagamento non si mostrano (il dispositivo non vende). */
  canSell?: boolean;
  onAction: (key: string) => Promise<unknown>;
  /** Dopo un incasso dal popup di cassa: nuovo valore del conteggio. */
  onPaid: (questionKey: string, after: number) => void;
  onClose: () => void;
  undo: { until: number } | null;
  onUndo: () => Promise<boolean | undefined | void>;
  /** "Già entrato": annulla quell'ingresso (con conferma), anche se è passato più di mezzo minuto. */
  onRevert: ((checkinId: string) => Promise<unknown>) | null;
};

/** Esito a tutto schermo (§12.3) con i pulsanti dei moduli sotto, es. "+1 Bambino". */
export function ResultOverlay({ outcome, actions: allActions, canSell = true, onAction, onPaid, onClose, undo, onUndo, onRevert }: Props) {
  const actions = canSell ? allActions : allActions.filter((a) => !a.paid);
  const p = present(outcome);
  const Icon = ICON[p.tone];
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [paying, setPaying] = useState<Props['actions'][number] | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const withActions = outcome.source === 'online' && (outcome.data.result === 'valid' || outcome.data.result === 'already_used') && actions.length > 0;
  const answers = outcome.source === 'online' ? outcome.data.answers : {};
  const [reverting, setReverting] = useState<RevertTarget | null>(null);
  const used = onRevert && outcome.source === 'online' && outcome.data.result === 'already_used' ? outcome.data : null;

  useEffect(() => {
    closeRef.current?.focus();
    if (p.tone !== 'success' || touched || withActions) return;
    const id = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [p.tone, touched, withActions, onClose]);

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="esito-titolo" className={cn('fixed inset-0 z-50 flex flex-col p-6', TONE[p.tone])} onPointerDown={() => setTouched(true)}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Icon size={88} strokeWidth={1.75} aria-hidden />
        <h2 id="esito-titolo" className="text-4xl leading-tight font-bold tracking-tight break-words sm:text-5xl">
          {p.title}
        </h2>
        <ul className="flex flex-col gap-1 text-section">
          {p.lines.map((l, i) => (
            <li key={i} className={i === 0 ? 'font-semibold' : 'opacity-90'}>
              {l}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        {withActions && (
          <div className="flex flex-col gap-2">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                disabled={busy !== null}
                onClick={async () => {
                  // Pulsante a pagamento: prima la cassa (prezzo dal server), il conteggio sale con l'incasso.
                  if (a.paid) return setPaying(a);
                  setBusy(a.key);
                  setActionError(null);
                  try {
                    await onAction(a.key);
                  } catch (e) {
                    setActionError(e instanceof Error ? e.message : 'Non riuscito.');
                  } finally {
                    setBusy(null);
                  }
                }}
                className={cn('flex min-h-14 items-center justify-between gap-2 rounded-xl bg-bg/95 px-4 text-section font-semibold text-fg disabled:opacity-60', focusRing)}
              >
                <span className="flex items-center gap-2">
                  <Plus size={20} aria-hidden />
                  {a.label}
                  {a.paid && <span className="font-normal text-muted tabular-nums">· {formatMoney(a.paid.priceCents)}</span>}
                </span>
                <span className="text-body font-normal text-muted tabular-nums">ora {answers[a.questionKey] ?? 0}</span>
              </button>
            ))}
            {actionError && (
              <p role="alert" className="rounded-lg bg-bg/95 px-3 py-2 text-body text-danger">
                {actionError}
              </p>
            )}
          </div>
        )}
        {paying && outcome.source === 'online' && 'ticket' in outcome.data && (
          <PayActionDialog orderId={outcome.data.ticket.orderId} action={paying} onClose={() => setPaying(null)} onPaid={(r) => onPaid(r.questionKey, r.after)} />
        )}
        {p.tone === 'success' && undo && <UndoBar until={undo.until} onUndo={onUndo} />}
        {used && (
          <button
            type="button"
            onClick={() => setReverting({ checkinId: used.checkinId, what: `${used.ticket.productName} · ${used.ticket.orderCode}`, at: used.at })}
            className={cn('flex min-h-12 items-center justify-center gap-2 rounded-xl bg-bg/95 px-4 text-body font-semibold text-fg', focusRing)}
          >
            <Undo2 size={18} aria-hidden /> Annulla questo ingresso
          </button>
        )}
        {actionError && !withActions && (
          <p role="alert" className="rounded-lg bg-bg/95 px-3 py-2 text-body text-danger">
            {actionError}
          </p>
        )}
        {onRevert && <RevertCheckinDialog target={reverting} onClose={() => setReverting(null)} onRevert={onRevert} onError={setActionError} />}
        <button ref={closeRef} type="button" onClick={onClose} className={cn('min-h-16 rounded-xl border-2 border-current text-title font-semibold', focusRing)}>
          Continua
        </button>
      </div>
    </div>
  );
}
