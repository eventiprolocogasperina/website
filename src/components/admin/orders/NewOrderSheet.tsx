'use client';

import { Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createOrderAction } from '@/app/admin/(org)/ordini/actions';
import { Button, Field, IconButton, Input, RadioGroup, Select, Sheet, SheetContent, SheetTrigger, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { OrderEditionContext } from '@/server/domain/orders/admin-context';

// "Nuovo ordine" (§11.1): canale admin (pagato subito o in attesa) oppure pay-link se il modulo è attivo.
// Il totale qui è solo una stima: prezzi, sconti e posti li calcola il server.

const PAY_OPTIONS = [
  { value: 'cash', label: 'Contanti, incassati ora' },
  { value: 'card_pos', label: 'Carta al POS, incassata ora' },
  { value: 'bank_transfer', label: 'Bonifico ricevuto' },
  { value: 'none', label: 'Da pagare (resta in attesa)' },
];

export function NewOrderSheet({ context, detailBase }: { context: OrderEditionContext; detailBase: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<'admin' | 'paylink'>('admin');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [sessionId, setSessionId] = useState('');
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [pay, setPay] = useState('cash');
  const [discountCode, setDiscountCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());

  const products = context.products.filter((p) => channel === 'admin' || p.paylink);
  const lines = products.filter((p) => (qty[p.id] ?? 0) > 0);
  const needsSession = lines.some((p) => p.requiresSession);
  const estimate = lines.reduce((s, p) => s + p.priceCents * qty[p.id], 0);
  const customerNeeded = channel === 'paylink';
  const ready = lines.length > 0 && (!needsSession || sessionId) && (!customerNeeded || (customer.name.trim().length > 1 && customer.email.includes('@')));

  function reset() {
    setQty({});
    setCustomer({ name: '', email: '', phone: '' });
    setDiscountCode('');
    setKey(crypto.randomUUID());
  }

  async function submit() {
    setBusy(true);
    const hasCustomer = customer.email.trim() !== '';
    const res = await createOrderAction({
      editionId: context.edition.id,
      channel,
      lines: lines.map((p) => ({ productId: p.id, quantity: qty[p.id], sessionId: p.requiresSession ? sessionId : null })),
      sessionId: needsSession ? sessionId : null,
      customer: hasCustomer ? { name: customer.name, email: customer.email, phone: customer.phone || null } : null,
      discountCode: discountCode || null,
      payNow: channel === 'admin' && pay !== 'none' ? (pay as 'cash' | 'card_pos' | 'bank_transfer') : null,
      idempotencyKey: key,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(channel === 'paylink' ? `Ordine ${res.data!.code} creato: manda il link al cliente` : `Ordine ${res.data!.code} creato`);
    setOpen(false);
    reset();
    router.push(`${detailBase}/${res.data!.code}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button icon={Plus}>Nuovo ordine</Button>
      </SheetTrigger>
      <SheetContent
        title="Nuovo ordine"
        description={context.edition.title}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-label text-muted">
              Totale stimato <strong className="text-fg tabular-nums">{formatMoney(estimate)}</strong>
            </span>
            <Button loading={busy} disabled={!ready} onClick={submit}>
              {channel === 'paylink' ? 'Crea link di pagamento' : 'Crea ordine'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {context.can.paylink && (
            <Field label="Canale">
              <RadioGroup
                orientation="horizontal"
                value={channel}
                onValueChange={(v) => setChannel(v as 'admin' | 'paylink')}
                options={[
                  { value: 'admin', label: 'Ordine admin' },
                  { value: 'paylink', label: 'Link di pagamento', description: 'Il cliente paga online; l’ordine resta in attesa fino ad allora.' },
                ]}
              />
            </Field>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label font-medium">Prodotti</legend>
            {products.length === 0 && <p className="text-body text-muted">Nessun prodotto vendibile da qui. Controlla il catalogo dell’edizione.</p>}
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="text-caption text-muted tabular-nums">{formatMoney(p.priceCents)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <IconButton icon={Minus} label={`Togli ${p.name}`} size="sm" variant="ghost" disabled={!qty[p.id]} onClick={() => setQty((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))} />
                  <span className="w-6 text-center tabular-nums">{qty[p.id] ?? 0}</span>
                  <IconButton icon={Plus} label={`Aggiungi ${p.name}`} size="sm" variant="ghost" onClick={() => setQty((q) => ({ ...q, [p.id]: Math.min(50, (q[p.id] ?? 0) + 1) }))} />
                </span>
              </div>
            ))}
          </fieldset>
          {needsSession && (
            <Field label="Data" required>
              <Select value={sessionId} onValueChange={setSessionId} options={context.sessions.filter((s) => s.status === 'open').map((s) => ({ value: s.id, label: s.label }))} />
            </Field>
          )}
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-label font-medium">{customerNeeded ? 'Cliente' : 'Cliente (facoltativo)'}</legend>
            <Field label="Nome e cognome" required={customerNeeded}>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Email" required={customerNeeded}>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Telefono">
              <Input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Codice sconto">
              <Input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} />
            </Field>
          </fieldset>
          {channel === 'admin' && (
            <Field label="Pagamento">
              <Select value={pay} onValueChange={setPay} options={PAY_OPTIONS} />
            </Field>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
