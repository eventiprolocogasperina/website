'use client';

import { CreditCard } from 'lucide-react';
import { useRef, useState } from 'react';
import { SettingsLayout } from '@/components/admin/settings/SettingsLayout';
import { AnnotatedSection, Badge, Button, Card, ConfirmDialog, KeyValue, PageHeader, toast } from '@/components/ui';
import type { PaymentForm } from '@/server/integrations/nexi';
import { testPaymentAction } from '../actions';
import { SecretBadge } from '../notifiche/SecretBadge';

type Status = { mode: 'test' | 'produzione' | 'simulatore'; alias: string; macKeySet: boolean; endpoint: string; ready: boolean };

const MODE_LABEL = { test: 'Prova (ambiente di test di Nexi)', produzione: 'Produzione', simulatore: 'Simulatore locale' } as const;
const RESULT = {
  ok: { tone: 'success', text: 'Il pagamento di prova è andato a buon fine: Nexi è collegato correttamente.' },
  ko: { tone: 'danger', text: 'Nexi ha rifiutato il pagamento di prova. Controlla la carta usata o i dati del contratto.' },
  annullato: { tone: 'warning', text: 'Il pagamento di prova è stato annullato prima della fine.' },
  firma: { tone: 'danger', text: 'La risposta di Nexi non ha una firma valida: controlla la chiave MAC su Vercel.' },
} as const;

export function PaymentsClient({ status, result }: { status: Status; result: keyof typeof RESULT | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<PaymentForm | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function start() {
    const res = await testPaymentAction();
    if (!res.ok || !res.data) {
      toast.error(res.ok ? 'Nexi non risponde.' : res.error);
      throw new Error('stop');
    }
    setForm(res.data);
    // Il modulo va inviato dal browser, come nel checkout: Nexi vuole un POST della pagina.
    setTimeout(() => formRef.current?.submit(), 0);
  }

  return (
    <>
      <PageHeader title="Pagamenti" subtitle="Collegamento con Nexi XPay per i pagamenti con carta del sito." />
      {result && (
        <p role="status" className={`mb-4 rounded-lg px-4 py-3 text-body ${RESULT[result].tone === 'success' ? 'bg-success-bg text-success' : RESULT[result].tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger'}`}>
          {RESULT[result].text}
        </p>
      )}
      <SettingsLayout sections={[{ id: 'nexi', label: 'Nexi' }, { id: 'prova', label: 'Pagamento di prova' }]}>
        <Card id="nexi">
          <AnnotatedSection title="Nexi XPay" description="Alias, ambiente e chiave MAC si impostano nelle variabili d’ambiente di Vercel (NEXI_ALIAS, NEXI_MODE, NEXI_MAC_KEY). La chiave non si mostra mai.">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone={status.mode === 'produzione' ? 'success' : 'info'}>{MODE_LABEL[status.mode]}</Badge>
                <SecretBadge label="Chiave MAC" set={status.macKeySet} />
              </div>
              <KeyValue
                items={[
                  { label: 'Alias', value: status.alias || <span className="text-warning">mancante</span> },
                  { label: 'Ambiente', value: MODE_LABEL[status.mode] },
                  { label: 'Indirizzo di Nexi', value: <span className="break-all">{status.endpoint}</span> },
                ]}
              />
            </div>
          </AnnotatedSection>
        </Card>
        <Card id="prova">
          <AnnotatedSection title="Pagamento di prova" description="Un pagamento vero da 1 € che non appartiene a nessun ordine: verifica alias, chiave e indirizzi di ritorno. In produzione l’euro va restituito da Nexi Business.">
            <Button icon={CreditCard} disabled={!status.ready} onClick={() => setConfirm(true)}>
              Pagamento di prova da 1 €
            </Button>
            <ConfirmDialog
              open={confirm}
              onOpenChange={setConfirm}
              tone="primary"
              title="Fare un pagamento di prova da 1 €?"
              description={
                status.mode === 'produzione'
                  ? 'Sei in produzione: l’addebito di 1 € sulla carta è reale. Finito il pagamento torni qui con l’esito.'
                  : 'Si apre la pagina di pagamento di Nexi in ambiente di prova: usa una carta di test. Finito il pagamento torni qui con l’esito.'
              }
              confirmLabel="Vai al pagamento"
              onConfirm={start}
            />
            {!status.ready && <p className="mt-2 text-body text-warning">Mancano alias o chiave MAC: il pagamento di prova non si può fare.</p>}
          </AnnotatedSection>
        </Card>
      </SettingsLayout>
      {form && (
        <form ref={formRef} method="POST" action={form.action} className="hidden">
          {Object.entries(form.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </>
  );
}
