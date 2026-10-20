'use client';

import { MessageCircle, Send, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchivedNotice } from '@/components/admin/edition/common';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, RadioGroup, Select, toast } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { previewWhatsappAction, sendWhatsappAction } from '@/app/admin/e/[edition]/m/[module]/actions';

type History = { id: string; createdAt: string; templateName: string; recipients: number; byStatus: Record<string, number> };
type Preview = { recipients: number; orders: number; withoutPhone: number; text: string };
const ALL = '__tutte';
const STATUS_LABELS: Record<string, string> = { accepted: 'accettati', sent: 'inviati', delivered: 'consegnati', read: 'letti', failed: 'non riusciti' };

export function BroadcastClient({
  edition,
  sessions,
  templates,
  history,
}: {
  edition: { slug: string; id: string; readOnly: boolean; whatsapp: boolean };
  sessions: Array<{ id: string; label: string }>;
  templates: Array<{ name: string; body: string }>;
  history: History[];
}) {
  const router = useRouter();
  const [templateName, setTemplateName] = useState(templates[0]?.name ?? '');
  const [sessionId, setSessionId] = useState(ALL);
  const [checkedIn, setCheckedIn] = useState<'any' | 'in' | 'out'>('any');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const segment = { editionId: edition.id, sessionId: sessionId === ALL ? null : sessionId, checkedIn, templateName };

  function change(fn: () => void) {
    fn();
    setPreview(null);
  }

  async function calc() {
    setLoading(true);
    const res = await previewWhatsappAction(segment);
    setLoading(false);
    if (!res.ok || !res.data) return toast.error(res.ok ? 'Riprova.' : res.error);
    setPreview(res.data);
  }

  async function send() {
    const res = await sendWhatsappAction(edition.slug, { ...segment, requestId, expectedRecipients: preview!.recipients });
    if (!res.ok || !res.data) {
      toast.error(res.ok ? 'Riprova.' : res.error);
      throw new Error('stop');
    }
    toast.success(`Messaggi inviati: ${res.data.sent} su ${res.data.recipients}${res.data.failed ? ` (${res.data.failed} non riusciti)` : ''}`);
    setPreview(null);
    setRequestId(crypto.randomUUID());
    router.refresh();
  }

  if (!edition.whatsapp) return <EmptyState icon={MessageCircle} title="L’invio su WhatsApp è spento" description="Accendilo nelle impostazioni del modulo Messaggi dell’edizione." />;
  if (!templates.length)
    return (
      <EmptyState
        icon={MessageCircle}
        title="Nessun modello WhatsApp approvato"
        description="Meta accetta solo modelli approvati. Aggiungine uno in Sistema → Notifiche."
        action={<Link href="/admin/sistema/notifiche#whatsapp" className="text-primary underline">Vai a Notifiche</Link>}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      {edition.readOnly && <ArchivedNotice />}
      <Card title="Nuovo messaggio">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Modello approvato">
            <Select value={templateName} onValueChange={(v) => change(() => setTemplateName(v))} options={templates.map((t) => ({ value: t.name, label: t.name }))} />
          </Field>
          <Field label="Data">
            <Select value={sessionId} onValueChange={(v) => change(() => setSessionId(v))} options={[{ value: ALL, label: 'Tutte le date' }, ...sessions.map((s) => ({ value: s.id, label: s.label }))]} />
          </Field>
          <Field label="Ingresso" className="md:col-span-2">
            <RadioGroup
              value={checkedIn}
              onValueChange={(v) => change(() => setCheckedIn(v as typeof checkedIn))}
              options={[
                { value: 'any', label: 'Tutti' },
                { value: 'in', label: 'Già entrati' },
                { value: 'out', label: 'Non ancora entrati' },
              ]}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" icon={Users} loading={loading} onClick={calc}>
            Calcola i destinatari
          </Button>
          <Button icon={Send} disabled={!preview || preview.recipients === 0 || edition.readOnly} onClick={() => setConfirm(true)}>
            {preview ? `Invia a ${preview.recipients} ${preview.recipients === 1 ? 'persona' : 'persone'}` : 'Invia'}
          </Button>
        </div>
        {preview && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="text-body text-muted">
              <p>
                <strong className="text-fg">{preview.recipients}</strong> numeri WhatsApp da {preview.orders} ordini pagati.
              </p>
              {preview.withoutPhone > 0 && <p className="text-warning">{preview.withoutPhone} ordini senza un numero valido non riceveranno il messaggio.</p>}
            </div>
            <p className="whitespace-pre-line rounded-lg bg-success-bg p-3 text-body text-fg">{preview.text}</p>
          </div>
        )}
      </Card>
      <Card title="Invii fatti">
        {history.length === 0 ? (
          <p className="text-body text-muted">Ancora nessun messaggio WhatsApp per questa edizione.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="font-medium text-fg">{h.templateName}</span> <span className="text-muted">· {formatDateTime(h.createdAt)} · {h.recipients} destinatari</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {Object.entries(h.byStatus).map(([s, n]) => (
                    <Badge key={s} tone={s === 'failed' ? 'danger' : s === 'read' || s === 'delivered' ? 'success' : 'neutral'}>
                      {n} {STATUS_LABELS[s] ?? s}
                    </Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {preview && (
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          tone="primary"
          title={`Inviare il messaggio a ${preview.recipients} ${preview.recipients === 1 ? 'persona' : 'persone'}?`}
          description="Il messaggio parte subito su WhatsApp e non si può ritirare."
          confirmLabel={`Invia a ${preview.recipients}`}
          confirmText={preview.recipients > 100 ? String(preview.recipients) : undefined}
          onConfirm={send}
        />
      )}
    </div>
  );
}
