'use client';

import { Plus, Trash2 } from 'lucide-react';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { useSettingsForm } from '@/components/admin/settings/useSettingsForm';
import { AnnotatedSection, Button, Card, ContextualSaveBar, Field, IconButton, Input, PageHeader } from '@/components/ui';
import type { SectionValues } from '@/server/domain/settings';
import { EditionNotifications, type EditionRow, type TypeInfo } from './EditionNotifications';
import { SecretBadge } from './SecretBadge';
import { WhatsappSection } from './WhatsappSection';

type Initial = { telegram: SectionValues<'telegram'>; whatsapp: SectionValues<'whatsapp'> };
export type Secrets = Record<string, boolean>;

const SECTIONS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'edizioni', label: 'Avvisi per edizione' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'rinvio', label: 'Rinvio (pagine di oggi)' },
];

export function NotificationsClient({ initial, editions, types, secrets }: { initial: Initial; editions: EditionRow[]; types: TypeInfo[]; secrets: Secrets }) {
  const form = useSettingsForm(initial as unknown as Record<'telegram' | 'whatsapp', Record<string, unknown>>);
  const t = form.values.telegram as Initial['telegram'];
  const setT = (patch: Partial<Initial['telegram']>) => form.set('telegram', patch);
  const chats = t.telegram_allowed_chats;

  return (
    <>
      <ContextualSaveBar dirty={form.dirty} saving={form.saving} onSave={form.save} onDiscard={form.discard} />
      <PageHeader title="Notifiche" subtitle="Avvisi allo staff su Telegram e messaggi WhatsApp ai partecipanti. Token e chiavi si impostano su Vercel e qui si vede solo se ci sono." />
      {form.error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-body text-danger">
          {form.error}
        </p>
      )}
      <SettingsLayout sections={SECTIONS}>
        <Card id="telegram">
          <AnnotatedSection
            title="Telegram"
            description="Il bot manda allo staff nuovi ordini, pagamenti non riusciti, richieste di rimborso, differenze di cassa e allarmi di errore. Mai nomi, email o telefoni dei clienti."
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <SecretBadge label="Token del bot" set={secrets.TELEGRAM_BOT_TOKEN} />
                <SecretBadge label="Segreto del webhook" set={secrets.TELEGRAM_WEBHOOK_SECRET} />
                <SecretBadge label="TELEGRAM_CHAT_ID" set={secrets.TELEGRAM_CHAT_ID} />
              </div>
              <Field label="Chat degli avvisi e degli allarmi" help="ID della chat dello staff. Vuoto: si usa TELEGRAM_CHAT_ID.">
                <Input value={t.telegram_alert_chat_id} onChange={(e) => setT({ telegram_alert_chat_id: e.target.value.trim() })} inputMode="numeric" placeholder="-1001234567890" />
              </Field>
              <div className="flex flex-col gap-2">
                <p className="text-label font-medium text-fg">Chat autorizzate ai comandi</p>
                <p className="text-body text-muted">
                  Solo queste chat (più quella degli avvisi) possono usare /stats, /ordini e /edizioni. Per l’ID, scrivi un messaggio al bot e chiedi a chi gestisce il sito.
                </p>
                {chats.map((c, i) => (
                  <div key={i} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Field label="ID della chat">
                      <Input value={c.id} onChange={(e) => setT({ telegram_allowed_chats: chats.map((x, j) => (j === i ? { ...x, id: e.target.value.trim() } : x)) })} inputMode="numeric" />
                    </Field>
                    <Field label="Nome (per riconoscerla)">
                      <Input value={c.label} onChange={(e) => setT({ telegram_allowed_chats: chats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    </Field>
                    <IconButton icon={Trash2} label={`Togli la chat ${c.label || c.id}`} onClick={() => setT({ telegram_allowed_chats: chats.filter((_, j) => j !== i) })} />
                  </div>
                ))}
                <Button variant="secondary" icon={Plus} className="self-start" disabled={chats.length >= 10} onClick={() => setT({ telegram_allowed_chats: [...chats, { id: '', label: '' }] })}>
                  Aggiungi chat
                </Button>
              </div>
            </div>
          </AnnotatedSection>
        </Card>
        <Card id="edizioni">
          <AnnotatedSection title="Avvisi per edizione" description="Quali avvisi Telegram arrivano per ogni edizione. Valgono per gli ordini del sistema nuovo: quelli delle pagine di oggi mandano ancora i loro messaggi.">
            <EditionNotifications editions={editions} types={types} />
          </AnnotatedSection>
        </Card>
        <WhatsappSection form={form} secrets={secrets} />
      </SettingsLayout>
    </>
  );
}
