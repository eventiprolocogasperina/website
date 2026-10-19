'use client';

import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Dialog, DialogContent } from './Dialog';
import { Field } from './Field';
import { Input } from './Input';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Domanda con verbo e oggetto: "Rimborsare l'ordine ZK26-7F3K?" */
  title: ReactNode;
  /** Conseguenza dell'azione, in una o due frasi. */
  description: ReactNode;
  /** Testo del pulsante di conferma, con verbo e oggetto ("Rimborsa 45,00 €"). */
  confirmLabel: string;
  cancelLabel?: string;
  /** danger per azioni distruttive (annulla, rimborsa, archivia, elimina). */
  tone?: 'danger' | 'primary';
  /**
   * Se presente, l'utente deve digitare esattamente questo testo per abilitare la conferma
   * (§11.7: importi sopra 100 € e archiviazioni).
   */
  confirmText?: string;
  /** Può essere asincrona: il pulsante mostra lo spinner e la finestra si chiude solo se va a buon fine. */
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
};

/** Conferma di un'azione che non si può annullare facilmente. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annulla',
  tone = 'danger',
  confirmText,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = !confirmText || typed.trim() === confirmText;

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) setTyped('');
    onOpenChange(next);
  };

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      setTyped('');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={tone} onClick={handleConfirm} disabled={!matches} loading={busy}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        {children}
        {confirmText && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (matches && !busy) void handleConfirm();
            }}
          >
            <Field label={<>Per confermare scrivi <strong className="font-semibold">{confirmText}</strong></>}>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus spellCheck={false} />
            </Field>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
