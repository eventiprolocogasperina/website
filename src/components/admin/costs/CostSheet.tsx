'use client';

import { Ban } from 'lucide-react';
import { useState } from 'react';
import { Button, Field, Input, MoneyInput, Select, Sheet, SheetContent, Switch, Textarea } from '@/components/ui';
import { COST_CATEGORIES, COST_PAYMENT_LABELS, COST_PAYMENT_METHODS, type CostPaymentMethod } from '@/lib/costs';
import { romeDateKey } from '@/lib/dates';
import type { CostInput, CostRow } from '@/server/domain/costs';
import { FileField } from './FileField';

const NO_ITEM = 'none';

/** Dettaglio di un costo: nuovo, modifica, o sola lettura (edizione conclusa o voce annullata). */
export function CostSheet({
  edition,
  row,
  readOnly,
  items,
  onClose,
  onSave,
  onVoid,
}: {
  edition: string | null;
  row: CostRow | null;
  readOnly: boolean;
  items: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (input: CostInput) => Promise<string | null>;
  onVoid?: () => void;
}) {
  const [form, setForm] = useState({
    spentOn: row?.spentOn ?? romeDateKey(new Date()),
    category: (row?.category ?? '') as CostInput['category'],
    description: row?.description ?? '',
    supplier: row?.supplier ?? '',
    amountCents: row?.amountCents ?? null,
    paymentMethod: (row?.paymentMethod ?? 'cash') as CostPaymentMethod,
    paid: row?.paid ?? true,
    paidAt: row?.paidAt ?? '',
    attachmentUrl: row?.attachmentUrl ?? null,
    notes: row?.notes ?? '',
    inventoryItemId: row?.inventoryItemId ?? NO_ITEM,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    if (!form.amountCents) return setError('Scrivi l’importo.');
    setBusy(true);
    setError('');
    const err = await onSave({ ...form, amountCents: form.amountCents, inventoryItemId: form.inventoryItemId === NO_ITEM ? null : form.inventoryItemId });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={row ? row.description : edition ? 'Nuovo costo dell’edizione' : 'Nuovo costo generale'}
        description={row?.voidedAt ? `Annullato: ${row.voidReason ?? ''}` : undefined}
        footer={
          readOnly ? (
            <Button variant="secondary" onClick={onClose}>
              Chiudi
            </Button>
          ) : (
            <>
              {onVoid && (
                <Button variant="ghost" icon={Ban} onClick={onVoid} className="mr-auto">
                  Annulla costo
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                Chiudi
              </Button>
              <Button onClick={submit} loading={busy}>
                Salva costo
              </Button>
            </>
          )
        }
      >
        <fieldset disabled={readOnly} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" required>
              <Input type="date" value={form.spentOn} onChange={(e) => set({ spentOn: e.target.value })} />
            </Field>
            <Field label="Importo" required>
              <MoneyInput value={form.amountCents} onValueChange={(amountCents) => set({ amountCents })} />
            </Field>
          </div>
          <Field label="Categoria" required>
            <Select value={form.category || undefined} onValueChange={(v) => set({ category: v as CostInput['category'] })} options={COST_CATEGORIES.map((c) => ({ value: c, label: c }))} disabled={readOnly} />
          </Field>
          <Field label="Descrizione" required>
            <Input value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Es. noleggio 4 gazebo" />
          </Field>
          <Field label="Fornitore">
            <Input value={form.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder="Chi hai pagato" />
          </Field>
          <Field label="Pagamento">
            <Select value={form.paymentMethod} onValueChange={(v) => set({ paymentMethod: v as CostPaymentMethod })} options={COST_PAYMENT_METHODS.map((m) => ({ value: m, label: COST_PAYMENT_LABELS[m] }))} disabled={readOnly} />
          </Field>
          <Switch label="Già pagato" checked={form.paid} onCheckedChange={(paid) => set({ paid })} disabled={readOnly} />
          {form.paid && (
            <Field label="Pagato il" help="Vuoto: la data del costo.">
              <Input type="date" value={form.paidAt} onChange={(e) => set({ paidAt: e.target.value })} />
            </Field>
          )}
          <FileField label="Ricevuta o fattura" help="PDF o foto, al massimo 8 MB." value={form.attachmentUrl} onChange={(attachmentUrl) => set({ attachmentUrl })} folder="pro-loco-gasperina/costi" />
          {items.length > 0 && (
            <Field label="Acquisto di materiale" help="Se hai comprato qualcosa che è nell’inventario.">
              <Select value={form.inventoryItemId} onValueChange={(inventoryItemId) => set({ inventoryItemId })} options={[{ value: NO_ITEM, label: 'Nessuno' }, ...items.map((i) => ({ value: i.id, label: i.name }))]} disabled={readOnly} />
            </Field>
          )}
          <Field label="Note">
            <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} />
          </Field>
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </fieldset>
      </SheetContent>
    </Sheet>
  );
}
