'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchivedNotice, Notice } from '@/components/admin/edition/common';
import {
  AnnotatedSection,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ContextualSaveBar,
  DatePicker,
  Field,
  Input,
  PageHeader,
  RadioGroup,
  Select,
  StatusBadge,
  Textarea,
  toast,
} from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import type { EditionStatus } from '@/server/domain/editions/types';
import { changeStatusAction, updateEditionAction } from '../actions';

type Form = {
  title: string;
  subtitle: string;
  location: string;
  coverImage: string;
  seriesId: string;
  startsDate: string;
  startsTime: string;
  endsDate: string;
  endsTime: string;
  publicPageMode: 'generic' | 'landing';
};
type Transition = { to: EditionStatus; label: string; description: string; typeToConfirm: boolean };
type ModuleInfo = { key: string; name: string; description: string; enabled: boolean };
type EditionInfo = { slug: string; title: string; status: EditionStatus; readOnly: boolean; concludedAt: string | null; archivedAt: string | null };

const NONE = '__nessuno';

export function SettingsClient({
  edition,
  initial,
  formats,
  transitions,
  modules,
}: {
  edition: EditionInfo;
  initial: Form;
  formats: Array<{ id: string; name: string; landingPath: string | null }>;
  transitions: Transition[];
  modules: ModuleInfo[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Transition | null>(null);
  const [reason, setReason] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const ro = edition.readOnly;
  const format = formats.find((f) => f.id === form.seriesId);

  async function save() {
    setSaving(true);
    setError('');
    const res = await updateEditionAction(edition.slug, {
      ...form,
      seriesId: form.seriesId || null,
      startsDate: form.startsDate || null,
      startsTime: form.startsDate ? form.startsTime || '00:00' : null,
      endsDate: form.endsDate || null,
      endsTime: form.endsDate ? form.endsTime || '23:59' : null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success('Impostazioni salvate');
    router.refresh();
  }

  async function changeStatus() {
    const res = await changeStatusAction(edition.slug, pending!.to, reason || null);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success(`Stato aggiornato: ${pending!.label.toLowerCase()}`);
    setReason('');
    router.refresh();
  }

  return (
    <>
      <ContextualSaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => (setForm(initial), setError(''))} />
      <PageHeader title="Impostazioni" badge={<StatusBadge status={edition.status} />} subtitle={edition.title} />
      {ro && <ArchivedNotice />}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-body text-danger">
          {error}
        </p>
      )}
      <Card>
        <AnnotatedSection title="Generale" description="Come si chiama l’edizione, dove e quando si svolge.">
          <div className="flex flex-col gap-4">
            <Field label="Titolo" required>
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} disabled={ro} />
            </Field>
            <Field label="Sottotitolo">
              <Input value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} disabled={ro} placeholder="Es. Il villaggio delle zucche" />
            </Field>
            <Field label="Luogo">
              <Input value={form.location} onChange={(e) => set({ location: e.target.value })} disabled={ro} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Inizio">
                <DatePicker value={form.startsDate} onValueChange={(startsDate) => set({ startsDate })} disabled={ro} />
              </Field>
              <Field label="Ora">
                <Input type="time" value={form.startsTime} onChange={(e) => set({ startsTime: e.target.value })} disabled={ro || !form.startsDate} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Fine">
                <DatePicker value={form.endsDate} onValueChange={(endsDate) => set({ endsDate })} disabled={ro} />
              </Field>
              <Field label="Ora">
                <Input type="time" value={form.endsTime} onChange={(e) => set({ endsTime: e.target.value })} disabled={ro || !form.endsDate} />
              </Field>
            </div>
            <Field label="Immagine di copertina" help="Indirizzo dell’immagine (Cloudinary o /images/…).">
              <Input value={form.coverImage} onChange={(e) => set({ coverImage: e.target.value })} disabled={ro} />
            </Field>
            <Field label="Format" help="Le edizioni dello stesso format condividono la pagina pubblica e l’archivio.">
              <Select
                value={form.seriesId || NONE}
                onValueChange={(v) => set({ seriesId: v === NONE ? '' : v })}
                disabled={ro}
                options={[{ value: NONE, label: 'Nessuno (evento singolo)' }, ...formats.map((f) => ({ value: f.id, label: f.name }))]}
              />
            </Field>
            <Field label="Slug" help="Non si può cambiare: lo usano ruoli, dispositivi e indirizzi.">
              <Input value={edition.slug} disabled readOnly />
            </Field>
          </div>
        </AnnotatedSection>

        <AnnotatedSection title="Pagina pubblica" description="Come appare l’edizione sul sito. Il collegamento con il sito arriva nella fase 4.">
          <RadioGroup
            aria-label="Pagina pubblica"
            value={form.publicPageMode}
            onValueChange={(v) => set({ publicPageMode: v as Form['publicPageMode'] })}
            disabled={ro}
            options={[
              { value: 'generic', label: 'Scheda nel calendario', description: 'La pagina standard degli eventi, in /eventi.' },
              {
                value: 'landing',
                label: 'Pagina dedicata',
                description: format?.landingPath ? `Una pagina a blocchi con lo stile del format, in ${format.landingPath}.` : 'Una pagina a blocchi con il suo indirizzo. Serve un format con una pagina pubblica.',
              },
            ]}
          />
        </AnnotatedSection>

        <AnnotatedSection
          title="Stato"
          description="Il ciclo di vita dell’edizione: bozza, pubblicata, in vendita, in corso, conclusa, archiviata. Per ora lo stato non cambia il sito pubblico né la cassa."
        >
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-2 text-body">
              Stato attuale: <StatusBadge status={edition.status} />
              {edition.concludedAt && <span className="text-label text-muted">conclusa il {formatDateTime(edition.concludedAt)}</span>}
              {edition.archivedAt && <span className="text-label text-muted">· archiviata il {formatDateTime(edition.archivedAt)}</span>}
            </p>
            {edition.status === 'concluded' && (
              <Notice>Prima di archiviare controlla che i turni di cassa siano chiusi e che non ci siano ordini in attesa né rimborsi aperti. La checklist automatica arriva con la fase 3.</Notice>
            )}
            {transitions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {transitions.map((t, i) => (
                  <Button key={t.to} variant={i === 0 && t.to !== 'archived' ? 'primary' : 'secondary'} onClick={() => setPending(t)} disabled={dirty}>
                    {t.label}
                  </Button>
                ))}
              </div>
            ) : (
              !ro && <p className="text-label text-muted">Non hai i permessi per cambiare lo stato.</p>
            )}
            {dirty && transitions.length > 0 && <p className="text-label text-muted">Salva le modifiche prima di cambiare lo stato.</p>}
          </div>
        </AnnotatedSection>

        <AnnotatedSection title="Moduli" description="Funzioni in più per questa edizione. Si attivano e disattivano dalla fase 2, prompt 11: per ora vedi quali sono previsti.">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {modules.map((m) => (
              <li key={m.key} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div>
                  <p className="text-body font-medium text-fg">{m.name}</p>
                  <p className="text-label text-muted">{m.description}</p>
                </div>
                {m.enabled ? <Badge tone="success">Attivo</Badge> : <Badge>Spento</Badge>}
              </li>
            ))}
          </ul>
        </AnnotatedSection>
      </Card>

      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={`${pending.label}: ${edition.title}?`}
          description={pending.description}
          confirmLabel={pending.label}
          tone={pending.to === 'archived' || pending.to === 'suspended' || pending.to === 'concluded' ? 'danger' : 'primary'}
          confirmText={pending.typeToConfirm ? edition.title : undefined}
          onConfirm={changeStatus}
        >
          {(pending.to === 'suspended' || pending.to === 'archived' || pending.to === 'concluded') && (
            <Field label="Motivo" help="Resta nel registro attività.">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </Field>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
