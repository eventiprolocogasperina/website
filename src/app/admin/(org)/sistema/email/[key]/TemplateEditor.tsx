'use client';

import { RotateCcw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, ConfirmDialog, ContextualSaveBar, Field, Input, PageHeader, Select, Skeleton, Textarea, toast } from '@/components/ui';
import { previewTemplateAction, resetTemplateAction, saveTemplateAction, sendTestEmailAction } from '../../actions';

type Draft = { subject: string; body: string };
type Props = {
  template: { key: string; label: string; when: string; wired: boolean };
  edition: { slug: string; readOnly: boolean } | null;
  initial: Draft;
  /** Da dove viene il testo: predefinito, modificato per tutti, dell'edizione, o ereditato (edizione senza testo proprio). */
  source: 'default' | 'global' | 'edition' | 'inherited';
  fallback: Draft;
  variables: Array<{ key: string; label: string }>;
  orders: Array<{ id: string; code: string; edition: string }>;
  editions: Array<{ slug: string; title: string }>;
  email: string | null;
};

const ALL = '__tutte';
const EXAMPLE = '__esempio';
const SOURCE = { default: 'Predefinito', global: 'Modificato', edition: 'Testo dell’edizione', inherited: 'Uguale a tutte le edizioni' } as const;

export function TemplateEditor({ template, edition, initial, source, fallback, variables, orders, editions, email }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [orderId, setOrderId] = useState(EXAMPLE);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = draft.subject !== initial.subject || draft.body !== initial.body;
  const ro = !!edition?.readOnly;
  const input = { key: template.key, edition: edition?.slug ?? null, ...draft, orderId: orderId === EXAMPLE ? null : orderId };

  // Anteprima aggiornata mezzo secondo dopo l'ultima modifica.
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await previewTemplateAction(input);
      if (res.ok && res.data) {
        setPreview(res.data);
        setPreviewError('');
      } else if (!res.ok) setPreviewError(res.error);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.subject, draft.body, orderId]);

  function insert(v: string) {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (!el) return setDraft((d) => ({ ...d, body: d.body + token }));
    const { selectionStart: a, selectionEnd: b } = el;
    setDraft((d) => ({ ...d, body: d.body.slice(0, a) + token + d.body.slice(b) }));
    requestAnimationFrame(() => (el.focus(), el.setSelectionRange(a + token.length, a + token.length)));
  }

  async function save() {
    setSaving(true);
    setError('');
    const res = await saveTemplateAction({ key: template.key, edition: edition?.slug ?? null, ...draft });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success('Modello salvato: vale dalla prossima email');
    router.refresh();
  }

  async function doReset() {
    const res = await resetTemplateAction({ key: template.key, edition: edition?.slug ?? null });
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    setDraft(fallback);
    toast.success(edition ? 'L’edizione usa di nuovo il testo di tutte le edizioni' : 'Ripristinato il testo predefinito');
    router.refresh();
  }

  async function sendTest() {
    setSending(true);
    const res = await sendTestEmailAction(input);
    setSending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Email di prova inviata a ${res.data?.to}`);
  }

  const canReset = source === 'global' || source === 'edition';
  return (
    <>
      <ContextualSaveBar dirty={dirty} saving={saving} saveDisabled={ro} onSave={save} onDiscard={() => (setDraft(initial), setError(''))} />
      <PageHeader title={template.label} badge={<Badge tone={source === 'default' || source === 'inherited' ? 'neutral' : 'info'}>{SOURCE[source]}</Badge>} subtitle={template.when} back={{ href: '/admin/sistema/email', label: 'Email' }} />
      {!template.wired && <p className="mb-4 rounded-lg bg-warning-bg px-4 py-3 text-body text-warning">Il sistema nuovo non invia ancora questa email: il testo è pronto per quando il flusso sarà attivo.</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-body text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Vale per" help={edition ? 'Questa edizione usa il suo testo invece di quello di tutte le edizioni.' : 'Scegli un’edizione per darle un testo diverso.'}>
              <Select
                value={edition?.slug ?? ALL}
                onValueChange={(v) => router.push(`/admin/sistema/email/${template.key}${v === ALL ? '' : `?edizione=${v}`}`)}
                options={[{ value: ALL, label: 'Tutte le edizioni' }, ...editions.map((e) => ({ value: e.slug, label: e.title }))]}
              />
            </Field>
            <Field label="Oggetto" required>
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} disabled={ro} maxLength={200} />
            </Field>
            <Field label="Testo" required help="Una riga vuota separa i paragrafi; **testo** diventa grassetto.">
              <Textarea ref={bodyRef} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} disabled={ro} rows={10} />
            </Field>
            <div>
              <p className="mb-2 text-label text-muted">Inserisci una variabile</p>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <button key={v.key} type="button" disabled={ro} onClick={() => insert(v.key)} title={v.label} className="rounded-md border border-border bg-surface-sunken px-2 py-1 font-mono text-label text-fg hover:border-border-strong disabled:opacity-50">
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="secondary" icon={Send} loading={sending} disabled={!email} onClick={sendTest}>
                Invia una prova a me
              </Button>
              {canReset && !ro && (
                <Button variant="ghost" icon={RotateCcw} onClick={() => setReset(true)}>
                  {edition ? 'Usa il testo di tutte le edizioni' : 'Ripristina il predefinito'}
                </Button>
              )}
            </div>
            {!email && <p className="text-label text-muted">Il tuo utente non ha un’email: non puoi ricevere la prova.</p>}
          </div>
        </Card>
        <Card title="Anteprima" description={preview ? `Oggetto: ${preview.subject}` : undefined}>
          <div className="flex flex-col gap-3">
            <Field label="Con i dati di">
              <Select
                value={orderId}
                onValueChange={setOrderId}
                options={[{ value: EXAMPLE, label: 'Valori d’esempio' }, ...orders.map((o) => ({ value: o.id, label: `${o.code} · ${o.edition}` }))]}
              />
            </Field>
            {previewError ? (
              <p className="rounded-lg bg-danger-bg px-3 py-2 text-body text-danger">{previewError}</p>
            ) : preview ? (
              <iframe title="Anteprima dell’email" srcDoc={preview.html} sandbox="" className="h-[560px] w-full rounded-lg border border-border bg-white" />
            ) : (
              <Skeleton className="h-[560px] w-full" />
            )}
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={reset}
        onOpenChange={setReset}
        title={edition ? 'Togliere il testo di questa edizione?' : 'Ripristinare il testo predefinito?'}
        description={edition ? 'L’edizione userà di nuovo il testo di tutte le edizioni.' : 'Il testo modificato si perde e le prossime email useranno quello predefinito.'}
        confirmLabel={edition ? 'Togli il testo dell’edizione' : 'Ripristina il predefinito'}
        onConfirm={doReset}
      />
    </>
  );
}
