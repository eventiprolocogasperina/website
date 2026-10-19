'use client';

import { Copy, Eye } from 'lucide-react';
import { useState } from 'react';
import { approveRefundAction, payRefundAction, rejectRefundAction, revealIbanAction } from '@/app/admin/(org)/rimborsi/actions';
import { Button, Dialog, DialogContent, Field, IconButton, KeyValue, Textarea, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { RefundRow } from '@/server/domain/refunds/admin';

/** Edizioni su cui l'utente può gestire i rimborsi e vedere l'IBAN ('all' = tutte). */
export type RefundPermissions = { refund: 'all' | string[]; viewIban: 'all' | string[] };
const allowed = (scope: 'all' | string[], edition: string) => scope === 'all' || scope.includes(edition);

export function RefundRowActions({ row, perms }: { row: RefundRow; perms: RefundPermissions }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reject, setReject] = useState(false);
  const [iban, setIban] = useState<{ iban: string | null; holderName: string | null } | null>(null);
  const canAct = allowed(perms.refund, row.editionSlug);

  async function run(kind: string, fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(kind);
    const res = await fn();
    setBusy(null);
    if (!res.ok) return toast.error(res.error ?? 'Errore');
    toast.success(done);
  }

  async function reveal() {
    setBusy('iban');
    const res = await revealIbanAction(row.id);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    setIban(res.data!);
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {row.iban && allowed(perms.viewIban, row.editionSlug) && <IconButton icon={Eye} label="Mostra IBAN intero" size="sm" variant="ghost" onClick={reveal} disabled={busy === 'iban'} />}
      {canAct && row.status === 'requested' && (
        <Button size="sm" loading={busy === 'approve'} onClick={() => run('approve', () => approveRefundAction(row.id), 'Rimborso approvato')}>
          Approva
        </Button>
      )}
      {canAct && row.status === 'approved' && (
        <Button size="sm" loading={busy === 'pay'} onClick={() => run('pay', () => payRefundAction(row.id), `Rimborso di ${formatMoney(row.amountCents)} segnato come eseguito`)}>
          Segna eseguito
        </Button>
      )}
      {canAct && (row.status === 'requested' || row.status === 'approved') && (
        <Button size="sm" variant="ghost" onClick={() => setReject(true)}>
          Rifiuta
        </Button>
      )}
      {reject && <RejectDialog row={row} onClose={() => setReject(false)} />}
      {iban && (
        <Dialog open onOpenChange={(o) => !o && setIban(null)}>
          <DialogContent title={`IBAN del rimborso ${row.orderCode}`} description="Questa lettura resta nel registro attività. Non copiarlo in chat o email." size="sm">
            <div className="flex flex-col gap-3">
              <KeyValue layout="stacked" items={[{ label: 'IBAN', value: <span className="font-mono break-all">{iban.iban ?? '—'}</span> }, { label: 'Intestatario', value: iban.holderName ?? '—' }, { label: 'Importo', value: formatMoney(row.amountCents) }]} />
              {iban.iban && (
                <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(iban.iban!).then(() => toast.success('IBAN copiato'))}>
                  Copia IBAN
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </span>
  );
}

function RejectDialog({ row, onClose }: { row: RefundRow; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const res = await rejectRefundAction(row.id, reason);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Richiesta rifiutata');
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Rifiuta il rimborso di ${row.orderCode}`}
        description={`${formatMoney(row.amountCents)} · ${row.customerName ?? row.customerEmail ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
            <Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={submit}>Rifiuta</Button>
          </>
        }
      >
        <Field label="Motivo" required help="Resta nel registro attività.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} />
        </Field>
      </DialogContent>
    </Dialog>
  );
}
