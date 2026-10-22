'use client';

import { Mail, Phone, User } from 'lucide-react';
import { Field } from '@/components/ui';
import { card, PublicCheckbox, PublicInput, SectionTitle } from './parts';

export type ContactData = { name: string; email: string; phone: string; privacy: boolean; marketing: boolean };

type Props = {
  data: ContactData;
  errors: Partial<Record<string, string>>;
  rulesUrl: string | null;
  onChange: (patch: Partial<ContactData>) => void;
};

/**
 * Dati di contatto (produzione 1775–1826): campi grandi con icona ed etichetta sempre visibile, errori sotto
 * ogni campo, consensi e link al regolamento dell'edizione (dal blocco Allegati, se c'è).
 * Gli id campo-name e campo-email servono al checkout per spostare il focus sul primo errore.
 */
export function ContactStep({ data, errors, rulesUrl, onChange }: Props) {
  return (
    <>
      <section className={`${card} flex flex-col gap-4 p-4 sm:p-6 [&_label]:text-pub-sm [&_label]:font-semibold`} aria-labelledby="titolo-dati">
        <SectionTitle id="titolo-dati" emoji="🧑" title="I tuoi dati di contatto" hint="Ti mandiamo i biglietti per email, con il QR da mostrare all’ingresso." />
        <Field id="campo-name" label="Nome e cognome" required error={errors.name}>
          <PublicInput icon={User} autoComplete="name" placeholder="Mario Rossi" value={data.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="campo-email" label="Email per i biglietti" help="Controlla bene: ti mandiamo qui i biglietti." required error={errors.email}>
            <PublicInput icon={Mail} type="email" inputMode="email" autoComplete="email" placeholder="nome@esempio.it" value={data.email} onChange={(e) => onChange({ email: e.target.value })} maxLength={200} />
          </Field>
          <Field id="campo-phone" label="Cellulare" help="Facoltativo: solo per avvisi sull’evento.">
            <PublicInput icon={Phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="+39 …" value={data.phone} onChange={(e) => onChange({ phone: e.target.value })} maxLength={30} />
          </Field>
        </div>
      </section>
      <section className={`${card} flex flex-col gap-4 p-4 sm:p-6`} aria-label="Consensi">
        <PublicCheckbox
          checked={data.privacy}
          onCheckedChange={(c) => onChange({ privacy: c })}
          error={errors.privacy}
          label={
            <>
              Ho letto l’
              <a href="/privacy" target="_blank" className="font-semibold text-primary underline underline-offset-2">
                informativa privacy
              </a>{' '}
              e acconsento al trattamento dei dati per l’acquisto.
            </>
          }
        />
        <PublicCheckbox checked={data.marketing} onCheckedChange={(c) => onChange({ marketing: c })} label="Voglio ricevere le novità sui prossimi eventi (facoltativo)." />
        {rulesUrl && (
          <p className="flex items-center gap-2 rounded-xl bg-[var(--ev-softer)] px-3 py-2.5 text-pub-sm text-[var(--ev-ink)]">
            <span aria-hidden>📄</span>
            <span>
              Partecipando accetti il{' '}
              <a href={rulesUrl} target="_blank" rel="noopener" className="font-semibold text-primary underline underline-offset-2">
                Regolamento ufficiale
              </a>{' '}
              dell’evento.
            </span>
          </p>
        )}
      </section>
    </>
  );
}
