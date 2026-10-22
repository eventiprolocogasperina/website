'use client';

import { ConfirmDialog } from '@/components/ui';

export type RevertTarget = { checkinId: string; what: string; at: string };

const time = (iso: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso));

/**
 * Conferma per annullare un ingresso anche dopo i 30 secondi di "Annulla ultimo". Il passaggio non si
 * cancella: resta segnato come annullato, con chi l'ha fatto, nel registro attività.
 * Un errore torna a chi apre la finestra (`onError`), che lo mostra nella sua schermata.
 */
export function RevertCheckinDialog({ target, onClose, onRevert, onError }: { target: RevertTarget | null; onClose: () => void; onRevert: (checkinId: string) => Promise<unknown>; onError: (message: string) => void }) {
  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title="Annullare questo ingresso?"
      description={target ? `${target.what}, entrato alle ${time(target.at)}. Il biglietto torna valido e può entrare di nuovo. L’annullo resta nel registro attività.` : ''}
      confirmLabel="Annulla l’ingresso"
      cancelLabel="Lascia entrato"
      tone="danger"
      onConfirm={async () => {
        if (!target) return;
        try {
          await onRevert(target.checkinId);
        } catch (e) {
          onError(e instanceof Error ? e.message : 'Annullo non riuscito. Riprova.');
        }
        onClose();
      }}
    />
  );
}
