'use client';

import { ArrowLeft, ArrowRight, Copy, FilePlus2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Field, Input, PageHeader, RadioGroup, Select, Switch } from '@/components/ui';
import { slugFromTitle } from '@/lib/edition-setup';
import type { WizardFormat } from '@/server/domain/editions/setup';
import { startEditionWizardAction } from '../actions';

const NEW_FORMAT = '__nuovo';
const INFO = '__info';
const DOTS = [
  { value: 'orange', label: 'Arancio' },
  { value: 'blue', label: 'Blu' },
  { value: 'gold', label: 'Oro' },
  { value: 'gray', label: 'Grigio' },
];

/** Passi 1 e 2 della procedura guidata: tipo di evento, poi nome e punto di partenza. Crea la bozza. */
export function NewEditionWizard({ formats, nextYear }: { formats: WizardFormat[]; nextYear: number }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [choice, setChoice] = useState(formats[0]?.id ?? NEW_FORMAT);
  const [fromPrevious, setFromPrevious] = useState(true);
  const [year, setYear] = useState(String(nextYear));
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [formatName, setFormatName] = useState('');
  const [dot, setDot] = useState('gray');
  const [sales, setSales] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const format = formats.find((f) => f.id === choice);
  const suggested = format ? `${format.name} ${year}` : choice === NEW_FORMAT && formatName ? `${formatName} ${year}` : '';
  const shownTitle = title || suggested;
  const shownSlug = slug || slugFromTitle(shownTitle);

  async function create() {
    setBusy(true);
    setError('');
    const base = { title: shownTitle, slug: shownSlug, year: Number(year) };
    const res = await startEditionWizardAction(
      format
        ? { type: 'format', seriesId: format.id, fromPrevious: fromPrevious && !!format.last, ...base }
        : choice === NEW_FORMAT
          ? { type: 'new-format', formatName, formatSlug: slugFromTitle(formatName), dot: dot as 'gray', sales, ...base }
          : { type: 'info', ...base },
    );
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/admin/e/${res.data!.slug}/procedura`);
  }

  return (
    <>
      <PageHeader
        title="Nuova edizione"
        back={{ href: '/admin/edizioni', label: 'Edizioni' }}
        subtitle={`Passo ${step} di 2 · poi date, biglietti, pagina e il resto, uno alla volta. Puoi saltare ogni passo e finirlo dopo: tutto resta in bozza.`}
      />
      {step === 1 ? (
        <Card title="Che evento è?" description="Gli eventi che si ripetono ogni anno sono format: la nuova edizione parte da quella dell’anno scorso.">
          <RadioGroup
            aria-label="Tipo di evento"
            value={choice}
            onValueChange={setChoice}
            options={[
              ...formats.map((f) => ({
                value: f.id,
                label: f.name,
                description: f.last ? `Ultima edizione: ${f.last.title}` : 'Nessuna edizione ancora',
              })),
              { value: NEW_FORMAT, label: 'Nuovo format', description: 'Un evento nuovo che si ripeterà: gli dai un nome, poi crei la prima edizione.' },
              { value: INFO, label: 'Solo pagina informativa', description: 'Un evento senza vendite: data, luogo e descrizione nel calendario.' },
            ]}
          />
          <div className="mt-4 flex justify-end">
            <Button iconEnd={ArrowRight} onClick={() => setStep(2)}>
              Continua
            </Button>
          </div>
        </Card>
      ) : (
        <Card title={format ? format.name : choice === NEW_FORMAT ? 'Nuovo format' : 'Evento informativo'}>
          <div className="flex flex-col gap-4">
            {format?.last && (
              <div className="rounded-lg border border-border bg-surface-sunken p-3">
                <Switch
                  checked={fromPrevious}
                  onCheckedChange={setFromPrevious}
                  label={`Parti da ${format.last.title}`}
                  description={`Copia pagina e grafica, moduli e regolamento, ${format.last.sessions} date (spostate di un anno), ${format.last.products} prodotti con i prezzi, ${format.last.registers} casse con i loro prodotti e le notifiche. Non copia ordini, ingressi, venduti né codici sconto.`}
                />
              </div>
            )}
            {choice === NEW_FORMAT && (
              <>
                <Field label="Nome del format" required help="Es. Gite: raccoglie le edizioni negli anni. Logo e pagina pubblica si impostano dopo in Format.">
                  <Input value={formatName} onChange={(e) => setFormatName(e.target.value)} placeholder="Es. Gite" />
                </Field>
                <Field label="Colore">
                  <Select value={dot} onValueChange={setDot} options={DOTS} />
                </Field>
                <Switch checked={sales} onCheckedChange={setSales} label="Con vendita di biglietti" description="Spegnilo se è solo una pagina informativa." />
              </>
            )}
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <Field label="Anno" required>
                <Input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </Field>
              <Field label="Titolo" required>
                <Input value={shownTitle} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Zuccaland 2027" />
              </Field>
            </div>
            <Field label="Slug" required help="Compare negli indirizzi. Non si cambia dopo.">
              <Input value={shownSlug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>
                Indietro
              </Button>
              <Button icon={format?.last && fromPrevious ? Copy : FilePlus2} loading={busy} onClick={create}>
                Crea la bozza e continua
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
