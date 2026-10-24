'use client';

import { Plus, Trash2 } from 'lucide-react';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { useSettingsForm } from '@/components/admin/settings/useSettingsForm';
import { AnnotatedSection, Button, Card, ContextualSaveBar, Field, IconButton, Input, PageHeader, Switch, Textarea } from '@/components/ui';
import type { SectionValues } from '@/server/domain/settings';

type Initial = { general: SectionValues<'general'>; legacy_notice: SectionValues<'legacy_notice'> };
type Topic = SectionValues<'general'>['whatsapp_topics'][number];

const SECTIONS = [
  { id: 'associazione', label: 'Associazione' },
  { id: 'social', label: 'Social' },
  { id: 'seo', label: 'SEO predefinita' },
  { id: 'supporto', label: 'Argomenti di supporto' },
  { id: 'avviso', label: 'Avviso di rinvio' },
];

export function GeneralSettingsClient({ initial }: { initial: Initial }) {
  const form = useSettingsForm(initial as unknown as Record<'general' | 'legacy_notice', Record<string, unknown>>);
  const g = form.values.general as Initial['general'];
  const n = form.values.legacy_notice as Initial['legacy_notice'];
  const setG = (patch: Partial<Initial['general']>) => form.set('general', patch);
  const setN = (patch: Partial<Initial['legacy_notice']>) => form.set('legacy_notice', patch);
  const text = (key: keyof Initial['general']) => ({ value: String(g[key] ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setG({ [key]: e.target.value }) });
  const setTopic = (i: number, patch: Partial<Topic>) => setG({ whatsapp_topics: g.whatsapp_topics.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <>
      <ContextualSaveBar dirty={form.dirty} saving={form.saving} onSave={form.save} onDiscard={form.discard} />
      <PageHeader title="Impostazioni" subtitle="Dati dell’associazione, social, SEO e contatti di supporto del sito." />
      {form.error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-body text-danger">
          {form.error}
        </p>
      )}
      <SettingsLayout sections={SECTIONS}>
        <Card id="associazione">
          <AnnotatedSection title="Associazione" description="Compaiono nel piè di pagina, nella pagina Trasparenza e nei rendiconti.">
            <div className="flex flex-col gap-4">
              <Field label="Nome">
                <Input {...text('association_name')} placeholder="Pro Loco Gasperina APS" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Codice fiscale">
                  <Input {...text('association_tax_code')} />
                </Field>
                <Field label="Telefono">
                  <Input {...text('contact_phone')} inputMode="tel" />
                </Field>
              </div>
              <Field label="Indirizzo">
                <Input {...text('association_address')} />
              </Field>
              <Field label="Email di contatto">
                <Input {...text('contact_email')} type="email" />
              </Field>
            </div>
          </AnnotatedSection>
        </Card>
        <Card id="social">
          <AnnotatedSection title="Social" description="Indirizzi completi delle pagine dell’associazione. Lascia vuoto quello che non usi.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram">
                <Input {...text('social_instagram')} type="url" placeholder="https://www.instagram.com/…" />
              </Field>
              <Field label="Facebook">
                <Input {...text('social_facebook')} type="url" placeholder="https://www.facebook.com/…" />
              </Field>
              <Field label="TikTok">
                <Input {...text('social_tiktok')} type="url" />
              </Field>
              <Field label="YouTube">
                <Input {...text('social_youtube')} type="url" />
              </Field>
            </div>
          </AnnotatedSection>
        </Card>
        <Card id="seo">
          <AnnotatedSection title="SEO predefinita" description="Titolo, descrizione e immagine per le pagine che non ne hanno di propri, e per l’anteprima dei link condivisi.">
            <div className="flex flex-col gap-4">
              <Field label="Titolo" help={`${g.seo_title.length}/70 caratteri`}>
                <Input {...text('seo_title')} maxLength={70} />
              </Field>
              <Field label="Descrizione" help={`${g.seo_description.length}/160 caratteri`}>
                <Textarea value={g.seo_description} onChange={(e) => setG({ seo_description: e.target.value })} maxLength={160} rows={3} />
              </Field>
              <Field label="Immagine di condivisione" help="Indirizzo di un’immagine 1200×630.">
                <Input {...text('seo_image')} type="url" />
              </Field>
            </div>
          </AnnotatedSection>
        </Card>
        <Card id="supporto">
          <AnnotatedSection title="Argomenti di supporto" description="Le voci del pulsante WhatsApp del sito: ogni argomento apre la chat con il numero indicato.">
            <div className="flex flex-col gap-3">
              {g.whatsapp_topics.length === 0 && <p className="text-body text-muted">Nessun argomento: il pulsante WhatsApp del sito non mostra scelte.</p>}
              {g.whatsapp_topics.map((t, i) => (
                <div key={t.id} className="grid items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                  <Field label="Testo">
                    <Input value={t.label} onChange={(e) => setTopic(i, { label: e.target.value })} />
                  </Field>
                  <Field label="Numero WhatsApp" help="Con prefisso, senza + (es. 393331234567)">
                    <Input value={t.phone} onChange={(e) => setTopic(i, { phone: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
                  </Field>
                  <IconButton icon={Trash2} label={`Togli “${t.label || 'argomento'}”`} onClick={() => setG({ whatsapp_topics: g.whatsapp_topics.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <Button
                variant="secondary"
                icon={Plus}
                className="self-start"
                disabled={g.whatsapp_topics.length >= 10}
                onClick={() => setG({ whatsapp_topics: [...g.whatsapp_topics, { id: `t${Date.now()}`, label: '', phone: '' }] })}
              >
                Aggiungi argomento
              </Button>
            </div>
          </AnnotatedSection>
        </Card>
        <Card id="avviso">
          <AnnotatedSection
            title="Avviso di rinvio"
            description="Banner in cima alla pagina Zuccaland di oggi. Per le edizioni nuove l’avviso lo gestisce il modulo Rinvio per maltempo."
          >
            <div className="flex flex-col gap-4">
              <Switch checked={n.zuccaland_postponed_enabled} onCheckedChange={(v) => setN({ zuccaland_postponed_enabled: v })} label="Mostra l’avviso" />
              <Field label="Titolo">
                <Input value={n.zuccaland_postponed_title} onChange={(e) => setN({ zuccaland_postponed_title: e.target.value })} placeholder="Avviso importante: rinvio per meteo avverso" />
              </Field>
              <Field label="Nuova data">
                <Input value={n.zuccaland_postponed_new_date} onChange={(e) => setN({ zuccaland_postponed_new_date: e.target.value })} placeholder="Sabato 31 ottobre 2026" />
              </Field>
              <Field label="Messaggio">
                <Textarea value={n.zuccaland_postponed_message} onChange={(e) => setN({ zuccaland_postponed_message: e.target.value })} rows={3} />
              </Field>
            </div>
          </AnnotatedSection>
        </Card>
      </SettingsLayout>
    </>
  );
}
