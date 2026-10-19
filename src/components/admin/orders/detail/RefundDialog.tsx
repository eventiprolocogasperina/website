'use client';

import { useState } from 'react';
import { refundAction } from '@/app/admin/(org)/ordini/actions';
import { Button, Checkbox, Dialog, DialogContent, Field, Input, MoneyInput, RadioGroup, Select, Textarea, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { OrderDetail } from '@/server/domain/orders/admin-detail';

/** Soglia oltre la quale si scrive il codice dell'ordine per confermare (§11.7). Il server la ricontrolla. */
const CONFIRM_ABOVE_CENTS = 10_000;

/**
 * Rimborsa (§11.7): si scelgono le righe, l'importo si calcola e si può correggere fino a quanto
 * pagato e non ancora rimborsato. Il rimborso nasce approvato; "già eseguito" lo segna subito pagato.
 */
export function RefundDialog({ d, onClose }: { d: OrderDetail; onClose: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState<number | null>(d.summary.refundableCents);
  const [touched, setTouched] = useState(false);
  const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'nexi'>(d.payments.some((p) => p.method === 'nexi') ? 'nexi' : 'cash');
  const [reason, setReason] = useState('');
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState(d.customer?.name ?? '');
  const [paidNow, setPaidNow] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const max = d.summary.refundableCents;

  function pick(lineId: string, n: number) {
    const next = { ...qty, [lineId]: n };
    setQty(next);
    if (!touched) {
      const sum = d.lines.reduce((s, l) => s + Math.round((l.totalCents / l.quantity) * (next[l.id] ?? 0)), 0);
      setAmount(Math.min(max, sum || max));
    }
  }

  const value = amount ?? 0;
  const needsCode = value > CONFIRM_ABOVE_CENTS;
  const valid = value > 0 && value <= max && reason.trim().length >= 3 && (!needsCode || code.trim().toUpperCase() === d.order.code) && (method !== 'bank_transfer' || !paidNow || iban.trim().length >= 15);

  async function submit() {
    setBusy(true);
    const res = await refundAction({
      orderId: d.order.id,
      amountCents: value,
      method,
      reason,
      confirmCode: needsCode ? code : null,
      paidNow,
      iban: method === 'bank_transfer' && iban ? iban : null,
      holderName: method === 'bank_transfer' && holder ? holder : null,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(paidNow ? `Rimborso di ${formatMoney(value)} registrato come eseguito` : `Rimborso di ${formatMoney(value)} approvato: lo trovi nella coda rimborsi`);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Rimborsa ${d.order.code}`}
        description={`Pagato ${formatMoney(d.summary.paidCents)} · già rimborsato o in corso ${formatMoney(d.summary.refundedCents + d.summary.refundPendingCents)} · rimborsabile ${formatMoney(max)}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
            <Button variant="danger" loading={busy} disabled={!valid} onClick={submit}>{`Rimborsa ${formatMoney(value)}`}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label font-medium">Cosa rimborsi</legend>
            {d.lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{`${l.productName} · ${formatMoney(Math.round(l.totalCents / l.quantity))} cad.`}</span>
                <Select
                  className="w-24"
                  value={String(qty[l.id] ?? 0)}
                  onValueChange={(v) => pick(l.id, Number(v))}
                  options={Array.from({ length: l.quantity + 1 }, (_, n) => ({ value: String(n), label: `${n} di ${l.quantity}` }))}
                />
              </div>
            ))}
          </fieldset>
          <Field label="Importo" help={`Al massimo ${formatMoney(max)}.`} error={value > max ? 'Supera quanto si può rimborsare.' : undefined}>
            <MoneyInput value={amount} onValueChange={(v) => { setTouched(true); setAmount(v); }} />
          </Field>
          <Field label="Come">
            <RadioGroup
              orientation="horizontal"
              value={method}
              onValueChange={(v) => setMethod(v as typeof method)}
              options={[
                { value: 'nexi', label: 'Storno sulla carta' },
                { value: 'cash', label: 'Contanti' },
                { value: 'bank_transfer', label: 'Bonifico' },
              ]}
            />
          </Field>
          {method === 'bank_transfer' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="IBAN" required={paidNow}>
                <Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} />
              </Field>
              <Field label="Intestatario">
                <Input value={holder} onChange={(e) => setHolder(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Motivo" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} placeholder="Es. il cliente non può venire" />
          </Field>
          <Checkbox checked={paidNow} onCheckedChange={setPaidNow} label="Rimborso già eseguito" description="Toglilo se il bonifico o lo storno lo farai dopo: il rimborso resta nella coda come approvato." />
          {needsCode && (
            <Field label={`Per confermare scrivi il codice dell’ordine (${d.order.code})`} required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
