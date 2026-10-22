'use client';

import { Field, Select, Textarea } from '@/components/ui';
import type { CheckoutView } from '@/server/domain/checkout';
import { card, PublicInput, SectionTitle } from './parts';

type Question = NonNullable<CheckoutView['activities']>['questions'][number];

/** Domande in più del modulo Attività (es. intolleranze), con l'errore sotto la singola domanda. */
export function QuestionFields({
  questions,
  answers,
  errors,
  onChange,
}: {
  questions: Question[];
  answers: Record<string, string>;
  errors: Partial<Record<string, string>>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <section className={`${card} flex flex-col gap-4 p-4 sm:p-6 [&_label]:text-pub-sm [&_label]:font-semibold`} aria-labelledby="titolo-domande">
      <SectionTitle id="titolo-domande" emoji="📝" title="Ancora qualche domanda" hint="Ci aiuta a organizzare la giornata." />
      {questions.map((q) => (
        <Field key={q.key} label={q.label} required={q.required} error={errors[`q:${q.key}`]}>
          {q.type === 'scelta' ? (
            <Select
              value={answers[q.key] ?? ''}
              onValueChange={(v) => onChange(q.key, v)}
              placeholder="Scegli"
              options={q.options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
                .map((o) => ({ value: o, label: o }))}
            />
          ) : q.type === 'numero' ? (
            <PublicInput type="number" inputMode="numeric" value={answers[q.key] ?? ''} onChange={(e) => onChange(q.key, e.target.value)} className="max-w-36" />
          ) : (
            <Textarea rows={2} maxLength={500} value={answers[q.key] ?? ''} onChange={(e) => onChange(q.key, e.target.value)} className="text-[16px]" />
          )}
        </Field>
      ))}
    </section>
  );
}
