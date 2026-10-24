'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { useSettingsForm } from '@/components/admin/settings/useSettingsForm';
import { AnnotatedSection, Button, Card, Checkbox, Field, IconButton, Input, Textarea } from '@/components/ui';
import type { SectionValues } from '@/server/domain/settings';
import { SecretBadge } from './SecretBadge';

type Wa = SectionValues<'whatsapp'>;
type Template = Wa['whatsapp_templates'][number];
const PARAMS: Array<{ value: Template['params'][number]; label: string }> = [
  { value: 'cliente.nome', label: 'Nome del cliente' },
  { value: 'ordine.codice', label: 'Codice ordine' },
  { value: 'edizione.titolo', label: 'Titolo dell’edizione' },
  { value: 'sessione.data', label: 'Data scelta nel segmento' },
];

/** Configurazione WhatsApp: credenziali (solo lo stato), modelli approvati da Meta e testi del rinvio di oggi. */
export function WhatsappSection({ form, secrets }: { form: ReturnType<typeof useSettingsForm<'telegram' | 'whatsapp'>>; secrets: Record<string, boolean> }) {
  const w = form.values.whatsapp as Wa;
  const set = (patch: Partial<Wa>) => form.set('whatsapp', patch);
  const templates = w.whatsapp_templates;
  const setTpl = (i: number, patch: Partial<Template>) => set({ whatsapp_templates: templates.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <>
      <Card id="whatsapp">
        <AnnotatedSection
          title="WhatsApp"
          description="Per i messaggi ai partecipanti (modulo Messaggi). Meta accetta solo modelli approvati: copia qui nome e testo di quelli approvati nel WhatsApp Manager."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <SecretBadge
                label="Token di accesso"
                set={secrets.WHATSAPP_ACCESS_TOKEN || secrets.legacyAccessToken}
                hint={secrets.WHATSAPP_ACCESS_TOKEN ? 'impostato' : 'salvato dalle impostazioni di prima'}
              />
              <SecretBadge label="App Secret (firma del webhook)" set={secrets.WHATSAPP_APP_SECRET} />
              <SecretBadge label="Token di verifica" set={secrets.WHATSAPP_VERIFY_TOKEN || secrets.legacyVerifyToken} />
            </div>
            <Field label="Phone Number ID" help={secrets.WHATSAPP_PHONE_NUMBER_ID ? 'Vuoto: si usa WHATSAPP_PHONE_NUMBER_ID.' : 'Lo trovi in WhatsApp Manager → Numeri di telefono.'}>
              <Input value={w.wa_phone_number_id} onChange={(e) => set({ wa_phone_number_id: e.target.value.trim() })} inputMode="numeric" />
            </Field>
            <div className="flex flex-col gap-3">
              <p className="text-label font-medium text-fg">Modelli approvati</p>
              {templates.length === 0 && <p className="text-body text-muted">Nessun modello: il modulo Messaggi non può ancora inviare su WhatsApp.</p>}
              {templates.map((t, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <Field label="Nome su Meta">
                      <Input value={t.name} onChange={(e) => setTpl(i, { name: e.target.value.trim().toLowerCase() })} placeholder="rinvio_evento" />
                    </Field>
                    <Field label="Lingua">
                      <Input value={t.language} onChange={(e) => setTpl(i, { language: e.target.value.trim() })} placeholder="it" />
                    </Field>
                    <IconButton icon={Trash2} label={`Togli il modello ${t.name || ''}`} onClick={() => set({ whatsapp_templates: templates.filter((_, j) => j !== i) })} />
                  </div>
                  <Field label="Testo approvato" help="Uguale a quello su Meta, con {{1}}, {{2}}… al posto delle parti variabili.">
                    <Textarea value={t.body} onChange={(e) => setTpl(i, { body: e.target.value })} rows={3} />
                  </Field>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-label text-muted">Valori di {'{{1}}'}, {'{{2}}'}… in ordine</legend>
                    {PARAMS.map((p) => (
                      <Checkbox
                        key={p.value}
                        checked={t.params.includes(p.value)}
                        onCheckedChange={(on) => setTpl(i, { params: on ? [...t.params, p.value] : t.params.filter((x) => x !== p.value) })}
                        label={`${t.params.includes(p.value) ? `{{${t.params.indexOf(p.value) + 1}}} ` : ''}${p.label}`}
                      />
                    ))}
                  </fieldset>
                </div>
              ))}
              <Button
                variant="secondary"
                icon={Plus}
                className="self-start"
                disabled={templates.length >= 20}
                onClick={() => set({ whatsapp_templates: [...templates, { name: '', language: 'it', body: '', params: [] }] })}
              >
                Aggiungi modello
              </Button>
            </div>
          </div>
        </AnnotatedSection>
      </Card>
      <Card id="rinvio">
        <AnnotatedSection title="Rinvio (pagine di oggi)" description="Testi usati dal pulsante di rinvio della pagina Ordini di oggi (Zuccaland 2026). Vuoti: valgono i testi predefiniti di quella pagina.">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Modello WhatsApp">
                <Input value={w.wa_template_name} onChange={(e) => set({ wa_template_name: e.target.value })} />
              </Field>
              <Field label="Lingua del modello">
                <Input value={w.wa_language_code} onChange={(e) => set({ wa_language_code: e.target.value })} placeholder="it" />
              </Field>
            </div>
            <Field label="Messaggio WhatsApp" help="Variabili: {{nome}}, {{evento}}, {{nuova_data}}, {{regolamento}}.">
              <Textarea value={w.wa_postponement_message} onChange={(e) => set({ wa_postponement_message: e.target.value })} rows={3} />
            </Field>
            <Field label="Oggetto dell’email">
              <Input value={w.email_postponement_subject} onChange={(e) => set({ email_postponement_subject: e.target.value })} />
            </Field>
            <Field label="Testo dell’email" help="Variabili: {{evento}}, {{nuova_data}}, {{ordine_id}}.">
              <Textarea value={w.email_postponement_body} onChange={(e) => set({ email_postponement_body: e.target.value })} rows={5} />
            </Field>
          </div>
        </AnnotatedSection>
      </Card>
    </>
  );
}
