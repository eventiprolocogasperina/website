'use client';

import { Printer } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Checkbox, EmptyState, Field, Input, Select, toast } from '@/components/ui';
import type { PrinterSettings } from '@/lib/cash/types';
import { saveRegisterAction } from './actions';
import type { AdminRegister, CashAdminData } from './types';

/**
 * Stampanti: impostazioni della stampante termica di ogni cassa (le stesse della vecchia cassa).
 * Il collegamento Bluetooth si fa dal telefono, nell'app /cassa.
 */
export function PrintersTab({ data }: { data: CashAdminData }) {
  if (data.registers.length === 0) {
    return (
      <Card className="mt-4">
        <EmptyState icon={Printer} title="Crea prima una cassa" description="Ogni cassa ha le sue impostazioni di stampa." />
      </Card>
    );
  }
  return (
    <div className="grid gap-4 pt-4 lg:grid-cols-2">
      {data.registers.map((r) => (
        <PrinterCard key={r.id} slug={data.edition.slug} register={r} editable={data.can.edit && !data.edition.readOnly} />
      ))}
    </div>
  );
}

function PrinterCard({ slug, register, editable }: { slug: string; register: AdminRegister; editable: boolean }) {
  const [p, setP] = useState<PrinterSettings>(register.printer);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof PrinterSettings>(k: K, v: PrinterSettings[K]) => setP((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    const res = await saveRegisterAction(slug, register.id, {
      name: register.name,
      issuesNumbers: register.issuesNumbers,
      active: register.active,
      productIds: register.productIds,
      printerSettings: { ...p, showQrCode: false },
    });
    setBusy(false);
    if (res.ok) toast.success(`Stampa di ${register.name} salvata`);
    else toast.error(res.error);
  }

  return (
    <Card
      title={register.name}
      description="Stampante termica collegata al telefono della cassa."
      footer={
        editable && (
          <div className="flex justify-end">
            <Button onClick={save} loading={busy}>
              Salva
            </Button>
          </div>
        )
      }
    >
      <fieldset disabled={!editable} className="flex flex-col gap-3">
        <Field label="Larghezza della carta">
          <Select
            value={String(p.ticketWidthMm)}
            onValueChange={(v) => setP((x) => ({ ...x, ticketWidthMm: Number(v), charactersPerLine: Number(v) >= 80 ? 48 : 32 }))}
            options={[
              { value: '58', label: '58 mm (32 caratteri)' },
              { value: '80', label: '80 mm (48 caratteri)' },
            ]}
          />
        </Field>
        <Field label="Intestazione">
          <Input value={p.headerTitle ?? ''} maxLength={48} onChange={(e) => set('headerTitle', e.target.value)} />
        </Field>
        <Field label="Piede" help="Es. “Grazie per il tuo contributo!”">
          <Input value={p.footerText ?? ''} maxLength={96} onChange={(e) => set('footerText', e.target.value)} />
        </Field>
        <Checkbox label="Stampa da sola a ogni vendita" checked={p.autoPrintOnOrder} onCheckedChange={(v) => set('autoPrintOnOrder', v)} disabled={!editable} />
        <Checkbox label="Ricevuta del contributo per il cliente" checked={p.printCustomerReceipt} onCheckedChange={(v) => set('printCustomerReceipt', v)} disabled={!editable} />
        <Checkbox label="Comande per reparto" description="Un foglietto per ogni reparto con le sue righe." checked={p.printDepartmentSlips} onCheckedChange={(v) => set('printDepartmentSlips', v)} disabled={!editable} />
        <Checkbox label="Taglio automatico della carta" checked={p.autoCutPaper} onCheckedChange={(v) => set('autoCutPaper', v)} disabled={!editable} />
      </fieldset>
    </Card>
  );
}
