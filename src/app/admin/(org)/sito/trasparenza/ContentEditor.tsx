'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnnotatedSection, Button, ContextualSaveBar, Field, IconButton, Input, Textarea, toast } from '@/components/ui';
import { TransparencyContent, type CookieItem, type Processor, type Treatment } from '@/lib/public/transparency';
import { publishTransparencyAction } from './actions';
import { RowsEditor } from './RowsEditor';

// Contenuti di /trasparenza come dati strutturati. "Pubblica" crea una nuova versione con una nota.

const BLANK_TREATMENT: Treatment = { name: '', data: '', purpose: '', legalBasis: '', retention: '' };
const BLANK_PROCESSOR: Processor = { name: '', service: '', country: '', privacyUrl: 'https://' };
const BLANK_COOKIE: CookieItem = { name: '', kind: 'cookie', purpose: '', duration: '', audience: 'public' };

export function ContentEditor({ initial }: { initial: TransparencyContent }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);
  const set = <K extends keyof TransparencyContent>(key: K, value: TransparencyContent[K]) => setC((x) => ({ ...x, [key]: value }));

  async function publish() {
    const parsed = TransparencyContent.safeParse(c);
    if (!parsed.success) return setError(`Controlla i campi: ${parsed.error.issues[0]?.message ?? 'dati non validi'}`);
    if (note.trim().length < 3) return setError('Scrivi in breve cosa è cambiato (compare nello storico pubblico).');
    setSaving(true);
    setError('');
    const res = await publishTransparencyAction(parsed.data, note);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success('Pagina Trasparenza aggiornata');
    setNote('');
    router.refresh();
  }

  return (
    <>
      <ContextualSaveBar dirty={dirty} saving={saving} onSave={publish} onDiscard={() => (setC(initial), setError(''))} message="Modifiche non pubblicate" />
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-danger bg-surface p-3 text-body text-danger">
          {error}
        </p>
      )}
      <AnnotatedSection title="Nota della versione" description="Obbligatoria per pubblicare: compare nello storico in fondo alla pagina pubblica.">
        <Field label="Cosa è cambiato">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. Aggiunto il fornitore delle email" maxLength={300} />
        </Field>
      </AnnotatedSection>

      <AnnotatedSection title="In breve" description="Tre o quattro frasi semplici su quali dati raccogliamo e perché.">
        <div className="flex flex-col gap-2">
          {c.summary.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <Textarea aria-label={`Frase ${i + 1}`} rows={2} value={line} onChange={(e) => set('summary', c.summary.map((l, j) => (j === i ? e.target.value : l)))} />
              <IconButton icon={Trash2} label="Togli la frase" size="sm" disabled={c.summary.length === 1} onClick={() => set('summary', c.summary.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div>
            <Button variant="secondary" size="sm" icon={Plus} disabled={c.summary.length >= 6} onClick={() => set('summary', [...c.summary, ''])}>
              Aggiungi una frase
            </Button>
          </div>
        </div>
      </AnnotatedSection>

      <AnnotatedSection title="Trattamenti" description="Per ogni attività: dati raccolti, finalità, base giuridica e tempo di conservazione.">
        <RowsEditor<Treatment>
          rows={c.treatments}
          blank={BLANK_TREATMENT}
          max={20}
          addLabel="Aggiungi un trattamento"
          title={(r) => r.name}
          onChange={(rows) => set('treatments', rows)}
          fields={[
            { key: 'name', label: 'Attività', wide: true },
            { key: 'data', label: 'Dati raccolti', kind: 'textarea' },
            { key: 'purpose', label: 'Finalità', kind: 'textarea' },
            { key: 'legalBasis', label: 'Base giuridica' },
            { key: 'retention', label: 'Conservazione' },
          ]}
        />
      </AnnotatedSection>

      <AnnotatedSection title="Fornitori" description="Chi tratta i dati per conto della Pro Loco, con il paese dei server e il link alla sua informativa.">
        <RowsEditor<Processor>
          rows={c.processors}
          blank={BLANK_PROCESSOR}
          max={20}
          addLabel="Aggiungi un fornitore"
          title={(r) => r.name}
          onChange={(rows) => set('processors', rows)}
          fields={[
            { key: 'name', label: 'Fornitore' },
            { key: 'service', label: 'Servizio' },
            { key: 'country', label: 'Paese' },
            { key: 'privacyUrl', label: 'Link all’informativa' },
          ]}
        />
      </AnnotatedSection>

      <AnnotatedSection title="Cookie e memoria del browser" description="Solo quelli tecnici davvero usati dal sito. Se il codice ne aggiunge uno, va aggiunto anche qui.">
        <RowsEditor<CookieItem>
          rows={c.cookies}
          blank={BLANK_COOKIE}
          max={30}
          addLabel="Aggiungi un cookie"
          title={(r) => r.name}
          onChange={(rows) => set('cookies', rows)}
          fields={[
            { key: 'name', label: 'Nome' },
            { key: 'duration', label: 'Durata' },
            { key: 'kind', label: 'Tipo', kind: 'select', options: [{ value: 'cookie', label: 'Cookie tecnico' }, { value: 'storage', label: 'Memoria del browser' }] },
            { key: 'audience', label: 'Per chi', kind: 'select', options: [{ value: 'public', label: 'Visitatori' }, { value: 'staff', label: 'Staff e volontari' }] },
            { key: 'purpose', label: 'A cosa serve', kind: 'textarea' },
          ]}
        />
      </AnnotatedSection>

      <AnnotatedSection title="Diritti e contatti" description="Il testo sopra il modulo di richiesta e l’email per la privacy.">
        <div className="flex flex-col gap-3">
          <Field label="Testo sui diritti">
            <Textarea rows={5} value={c.rightsNote} onChange={(e) => set('rightsNote', e.target.value)} />
          </Field>
          <Field label="Email per la privacy">
            <Input type="email" value={c.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
          </Field>
        </div>
      </AnnotatedSection>
    </>
  );
}
