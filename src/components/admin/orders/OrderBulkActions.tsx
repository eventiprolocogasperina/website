'use client';

import { CalendarClock, Download, Mail, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { bulkMessageAction, bulkMoveAction, bulkResendAction } from '@/app/admin/(org)/ordini/actions';
import { BulkActionBar, Button, Dialog, DialogContent, Field, Input, Select, Textarea, toast } from '@/components/ui';
import type { OrderEditionContext } from '@/server/domain/orders/admin-context';
import type { BulkOutcome } from '@/server/domain/orders/admin';

/**
 * Azioni sugli ordini selezionati: reinvia biglietti, esporta CSV e, in un'edizione con i moduli
 * attivi, sposta data (postponement) e invia messaggio (broadcast).
 */
export function OrderBulkActions({ ids, context, exportHref, onDone, onClear }: { ids: string[]; context: OrderEditionContext | null; exportHref: string; onDone: () => void; onClear: () => void }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'move' | 'message' | null>(null);
  const [busy, setBusy] = useState(false);

  function report(out: BulkOutcome, verb: string) {
    if (out.failed.length === 0) toast.success(`${out.done.length} ${out.done.length === 1 ? 'ordine' : 'ordini'}: ${verb}`);
    else toast.warning(`${out.done.length} riusciti, ${out.failed.length} no. Primo errore: ${out.failed[0].error}`);
    onDone();
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    const res = await bulkResendAction(ids);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    report(res.data!, 'biglietti reinviati');
  }

  return (
    <>
      <BulkActionBar
        count={ids.length}
        noun={['ordine', 'ordini']}
        onClear={onClear}
        actions={
          <>
            {(!context || context.can.resend) && (
              <Button size="sm" variant="secondary" icon={Send} loading={busy} onClick={resend}>
                Reinvia biglietti
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={Download} onClick={() => (window.location.href = `${exportHref}?ids=${ids.join(',')}`)}>
              Esporta CSV
            </Button>
            {context?.can.move && (
              <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => setDialog('move')}>
                Sposta data
              </Button>
            )}
            {context?.can.message && (
              <Button size="sm" variant="secondary" icon={Mail} onClick={() => setDialog('message')}>
                Invia messaggio
              </Button>
            )}
          </>
        }
      />
      {dialog === 'move' && context && <MoveDialog ids={ids} context={context} onClose={() => setDialog(null)} onDone={(o) => report(o, 'spostati')} />}
      {dialog === 'message' && context && <MessageDialog ids={ids} editionId={context.edition.id} onClose={() => setDialog(null)} onDone={onDone} />}
    </>
  );
}

function MoveDialog({ ids, context, onClose, onDone }: { ids: string[]; context: OrderEditionContext; onClose: () => void; onDone: (o: BulkOutcome) => void }) {
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const res = await bulkMoveAction(ids, to, reason);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    onClose();
    onDone(res.data!);
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Sposta ${ids.length} ${ids.length === 1 ? 'ordine' : 'ordini'}`}
        description="I biglietti passano alla nuova data se ci sono posti. Gli ordini che non si possono spostare restano dove sono."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
            <Button loading={busy} disabled={!to} onClick={submit}>Sposta</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nuova data" required>
            <Select value={to} onValueChange={setTo} options={context.sessions.filter((s) => s.status === 'open').map((s) => ({ value: s.id, label: s.label }))} />
          </Field>
          <Field label="Motivo" help="Resta nel registro attività.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Es. rinvio per maltempo" />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageDialog({ ids, editionId, onClose, onDone }: { ids: string[]; editionId: string; onClose: () => void; onDone: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const res = await bulkMessageAction(editionId, ids, subject, body);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    const { sent, failed } = res.data!;
    if (failed) toast.warning(`${sent} email inviate, ${failed} non partite.`);
    else toast.success(`${sent} email inviate`);
    onClose();
    onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Invia un messaggio"
        description="Un’email a ogni cliente degli ordini scelti, una sola per indirizzo."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
            <Button loading={busy} disabled={subject.trim().length < 3 || body.trim().length < 10} onClick={submit}>Invia</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Oggetto" required>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          </Field>
          <Field label="Messaggio" required>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={3000} />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
