'use client';

import { Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, EmptyState, Field, Select, Sheet, SheetContent, Textarea, toast, type BadgeTone } from '@/components/ui';
import { PRIVACY_REQUEST_LABELS, PRIVACY_REQUEST_STATUSES, PRIVACY_STATUS_LABELS, type PrivacyRequestKind, type PrivacyRequestStatus } from '@/lib/public/transparency';
import { updatePrivacyRequestAction } from './actions';

export type RequestRow = {
  id: string;
  kind: PrivacyRequestKind;
  name: string;
  email: string;
  message: string | null;
  status: PrivacyRequestStatus;
  resolutionNote: string | null;
  handledAt: string | null;
  createdAt: string;
};

const TONE: Record<PrivacyRequestStatus, BadgeTone> = { new: 'warning', in_progress: 'info', done: 'success', rejected: 'neutral' };
const when = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short', year: 'numeric' });
/** Termine di legge: 30 giorni dalla richiesta (art. 12.3 GDPR). */
const deadline = (iso: string) => new Date(new Date(iso).getTime() + 30 * 86_400_000).toISOString();

/** Richieste arrivate dal modulo di /trasparenza: una scheda per richiesta (anche su telefono). */
export function RequestsPanel({ rows }: { rows: RequestRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<RequestRow | null>(null);
  const [status, setStatus] = useState<PrivacyRequestStatus>('in_progress');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!rows.length) return <EmptyState icon={Inbox} title="Nessuna richiesta" description="Le richieste inviate dal modulo della pagina Trasparenza compaiono qui." />;

  function edit(r: RequestRow) {
    setOpen(r);
    setStatus(r.status === 'new' ? 'in_progress' : r.status);
    setNote(r.resolutionNote ?? '');
  }

  async function save() {
    if (!open) return;
    setSaving(true);
    const res = await updatePrivacyRequestAction(open.id, status, note);
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Richiesta aggiornata');
    setOpen(null);
    router.refresh();
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const late = (r.status === 'new' || r.status === 'in_progress') && deadline(r.createdAt) < new Date().toISOString();
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-body font-medium text-fg">
                  {PRIVACY_REQUEST_LABELS[r.kind]} <Badge tone={TONE[r.status]}>{PRIVACY_STATUS_LABELS[r.status]}</Badge>
                  {late && <Badge tone="danger">Oltre i 30 giorni</Badge>}
                </p>
                <p className="text-label text-muted">
                  {r.name} · <a href={`mailto:${r.email}`} className="text-primary underline-offset-2 hover:underline">{r.email}</a> · arrivata il {when(r.createdAt)}
                  {r.status !== 'done' && r.status !== 'rejected' && ` · rispondere entro il ${when(deadline(r.createdAt))}`}
                </p>
                {r.message && <p className="mt-1 whitespace-pre-line text-body">{r.message}</p>}
                {r.resolutionNote && <p className="mt-1 text-label text-muted">Nota: {r.resolutionNote}</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={() => edit(r)}>
                Gestisci
              </Button>
            </li>
          );
        })}
      </ul>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent title="Gestisci la richiesta" description={open ? `${PRIVACY_REQUEST_LABELS[open.kind]} · ${open.name}` : undefined}>
          <div className="flex flex-col gap-4">
            <Field label="Stato">
              <Select value={status} onValueChange={(v) => setStatus(v as PrivacyRequestStatus)} options={PRIVACY_REQUEST_STATUSES.map((s) => ({ value: s, label: PRIVACY_STATUS_LABELS[s] }))} />
            </Field>
            <Field label="Nota interna" help="Cosa è stato fatto e quando hai risposto. Obbligatoria se respingi la richiesta.">
              <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
            </Field>
            <Button onClick={save} loading={saving}>
              Salva
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
