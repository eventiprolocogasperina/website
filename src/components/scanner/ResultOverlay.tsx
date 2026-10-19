'use client';

import { CheckCircle2, Clock3, Plus, XOctagon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn, focusRing } from '@/components/ui';
import { present, type Tone } from './present';
import { UndoBar } from './UndoBar';
import type { Outcome, ScannerSetup } from './types';

const TONE: Record<Tone, string> = {
  success: 'bg-success text-bg',
  warning: 'bg-warning text-bg',
  danger: 'bg-danger text-bg',
};
const ICON = { success: CheckCircle2, warning: Clock3, danger: XOctagon } as const;
/** Un esito verde si chiude da solo, così la fila scorre; gli altri restano finché non tocchi. */
const AUTO_CLOSE_MS = 3500;

type Props = {
  outcome: Outcome;
  actions: ScannerSetup['actions'];
  onAction: (key: string) => Promise<unknown>;
  onClose: () => void;
  undo: { until: number } | null;
  onUndo: () => Promise<boolean | undefined | void>;
};

/** Esito a tutto schermo (§12.3) con i pulsanti dei moduli sotto, es. "+1 Bambino". */
export function ResultOverlay({ outcome, actions, onAction, onClose, undo, onUndo }: Props) {
  const p = present(outcome);
  const Icon = ICON[p.tone];
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const withActions = outcome.source === 'online' && (outcome.data.result === 'valid' || outcome.data.result === 'already_used') && actions.length > 0;
  const answers = outcome.source === 'online' ? outcome.data.answers : {};

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
        {p.tone === 'success' && undo && <UndoBar until={undo.until} onUndo={onUndo} />}
        <button ref={closeRef} type="button" onClick={onClose} className={cn('min-h-16 rounded-xl border-2 border-current text-title font-semibold', focusRing)}>
          Continua
        </button>
      </div>
    </div>
  );
}
