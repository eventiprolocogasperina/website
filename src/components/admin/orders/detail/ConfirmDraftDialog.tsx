'use client';

import { useState } from 'react';
import { confirmDraftAction } from '@/app/admin/(org)/ordini/actions';
import { Field, Input, RadioGroup, Textarea, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { DraftConfirmMode } from '@/server/domain/orders/drafts';
import { ActionDialog, type Props } from './OrderDialogs';

// "Conferma ordine" di una bozza: si sceglie come si paga. Prezzi e posti li ricontrolla il server.

const SUCCESS: Record<DraftConfirmMode, string> = {
  paylink: 'Ordine confermato: link di pagamento inviato',
  on_site: 'Ordine confermato: da pagare in loco',
  cash: 'Ordine confermato e pagato in contanti',
  complimentary: 'Ordine confermato come omaggio',
};

export function ConfirmDraftDialog({ d, onClose, canCash }: Props & { canCash: boolean }) {
  const hasEmail = !!d.customer?.email;
  const paylinkOn = d.edition.modules.includes('paylink');
  const [mode, setMode] = useState<DraftConfirmMode>(hasEmail && paylinkOn ? 'paylink' : 'on_site');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const paylinkHint = !paylinkOn ? 'Attiva il modulo Pay-link per questa edizione.' : !hasEmail ? 'Serve l’email del cliente: aggiungila con “Modifica bozza”.' : 'L’ordine resta in attesa fino al pagamento online, poi arrivano i biglietti.';
  return (
    <ActionDialog
      title={`Conferma ${d.order.code}`}
      description={`Totale indicativo ${formatMoney(d.order.totalCents)}: alla conferma prezzi e posti si ricalcolano.`}
      confirm="Conferma ordine"
      ready={mode !== 'complimentary' || reason.trim().length >= 3}
      run={() => confirmDraftAction({ orderId: d.order.id, mode, reason: mode === 'complimentary' ? reason : null, note: note || null })}
      onSuccess={(data) => {
        const r = data as { emailSent: boolean | null };
        if (r.emailSent === false) toast.warning('Ordine confermato, ma l’email non è partita: riprova da “Reinvia biglietti” o controlla il registro email.');
        else toast.success(SUCCESS[mode]);
        onClose();
      }}
      onClose={onClose}
    >
      <Field label="Pagamento">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as DraftConfirmMode)}
          options={[
            { value: 'paylink', label: 'Link di pagamento via email', description: paylinkHint, disabled: !hasEmail || !paylinkOn },
            { value: 'on_site', label: 'Paga in loco', description: 'Tiene i posti senza scadenza. Si incassa all’evento, in cassa o al varco; i biglietti entrano solo dopo.' },
            { value: 'cash', label: 'Contanti, incassati ora', description: hasEmail ? 'I biglietti partono per email.' : 'Senza email: i biglietti restano nell’ordine.', disabled: !canCash },
            { value: 'complimentary', label: 'Omaggio', description: 'Coperto da un omaggio, con il motivo nel registro.' },
          ]}
        />
      </Field>
      {mode === 'complimentary' && (
        <Field label="Motivo dell’omaggio" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </Field>
      )}
      <Field label="Note" help="Nota interna: la vedono solo gli operatori.">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} />
      </Field>
    </ActionDialog>
  );
}
