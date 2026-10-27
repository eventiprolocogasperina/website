'use client';

import { Minus, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createDraftAction, createOrderAction, updateDraftAction } from '@/app/admin/(org)/ordini/actions';
import { Button, Checkbox, Field, IconButton, Input, RadioGroup, Select, Sheet, SheetContent, SheetTrigger, Textarea, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { OrderEditionContext } from '@/server/domain/orders/admin-context';

// "Nuovo ordine" (§11.1): canale admin (pagato subito, omaggio o in attesa), pay-link se il modulo è
// attivo, oppure "Salva in bozza". Con `draft` la stessa finestra modifica una bozza esistente.
// Il totale qui è solo una stima: prezzi, sconti e posti li calcola il server.

const PAY_OPTIONS = [
  { value: 'cash', label: 'Contanti, incassati ora' },
  { value: 'card_pos', label: 'Carta al POS, incassata ora' },
  { value: 'bank_transfer', label: 'Bonifico ricevuto' },
  { value: 'complimentary', label: 'Omaggio' },
  { value: 'none', label: 'Da pagare (resta in attesa)' },
];

export type DraftValues = {
  orderId: string;
  lines: Array<{ productId: string; quantity: number; sessionId: string | null }>;
  sessionId: string | null;
  customer: { name: string; email: string; phone: string } | null;
  discountCode: string | null;
};

type Props = { context: OrderEditionContext; detailBase?: string; draft?: DraftValues };

const qtyOf = (draft?: DraftValues) => Object.fromEntries((draft?.lines ?? []).map((l) => [l.productId, l.quantity]));

export function NewOrderSheet({ context, detailBase = '', draft }: Props) {
  const router = useRouter();
  const editing = !!draft;
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<'admin' | 'paylink'>('admin');
  const [qty, setQty] = useState<Record<string, number>>(() => qtyOf(draft));
  const [overCapacity, setOverCapacity] = useState(false);
  const [sessionId, setSessionId] = useState(draft?.sessionId ?? draft?.lines.find((l) => l.sessionId)?.sessionId ?? '');
  const [customer, setCustomer] = useState(draft?.customer ?? { name: '', email: '', phone: '' });
  const [pay, setPay] = useState('cash');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [discountCode, setDiscountCode] = useState(draft?.discountCode ?? '');
  const [busy, setBusy] = useState<'order' | 'draft' | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());

  const products = context.products.filter((p) => channel === 'admin' || p.paylink);
  const lines = products.filter((p) => (qty[p.id] ?? 0) > 0);
  const needsSession = lines.some((p) => p.requiresSession);
  const estimate = lines.reduce((s, p) => s + p.priceCents * qty[p.id], 0);
  const customerNeeded = channel === 'paylink';
  const hasCustomer = customer.email.trim() !== '';
  const base = lines.length > 0 && (!needsSession || sessionId) && (!hasCustomer || customer.email.includes('@'));
  const ready = base && (!customerNeeded || (customer.name.trim().length > 1 && hasCustomer)) && (pay !== 'complimentary' || channel !== 'admin' || reason.trim().length >= 3);

  function reset() {
    setQty({});
    setCustomer({ name: '', email: '', phone: '' });
    setDiscountCode('');
    setReason('');
    setNote('');
    setKey(crypto.randomUUID());
  }

  const payload = () => ({
    editionId: context.edition.id,
    lines: lines.map((p) => ({ productId: p.id, quantity: qty[p.id], sessionId: p.requiresSession ? sessionId : null })),
    sessionId: needsSession ? sessionId : null,
    customer: hasCustomer ? { name: customer.name, email: customer.email, phone: customer.phone || null } : null,
    discountCode: discountCode || null,
    idempotencyKey: key,
  });

  async function submit(kind: 'order' | 'draft') {
    setBusy(kind);
    if (editing) {
      const { lines: l, sessionId: s, customer: c, discountCode: dc } = payload();
      const res = await updateDraftAction({ orderId: draft.orderId, lines: l, sessionId: s, customer: c, discountCode: dc });
      setBusy(null);
      if (!res.ok) return toast.error(res.error);
      toast.success('Bozza aggiornata');
      setOpen(false);
      return router.refresh();
    }
    const res =
      kind === 'draft'
        ? await createDraftAction({ ...payload(), note: note || null })
        : await createOrderAction({
            ...payload(),
            channel,
            note: note || null,
            payNow: channel === 'admin' && pay !== 'none' ? (pay as 'cash' | 'card_pos' | 'bank_transfer' | 'complimentary') : null,
            complimentaryReason: channel === 'admin' && pay === 'complimentary' ? reason : null,
            overCapacity,
          });
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    const code = res.data!.code;
    toast.success(kind === 'draft' ? `Bozza ${code} salvata` : channel === 'paylink' ? `Ordine ${code} creato: manda il link al cliente` : `Ordine ${code} creato`);
    setOpen(false);
    reset();
    router.push(`${detailBase}/${code}`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {editing ? <Button variant="secondary" icon={Pencil}>Modifica bozza</Button> : <Button icon={Plus}>Nuovo ordine</Button>}
      </SheetTrigger>
      <SheetContent
        title={editing ? 'Modifica bozza' : 'Nuovo ordine'}
        description={context.edition.title}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <span className="text-label text-muted">
              Totale stimato <strong className="text-fg tabular-nums">{formatMoney(estimate)}</strong>
            </span>
            <span className="flex gap-2">
              {(editing || channel === 'admin') && (
                <Button variant={editing ? 'primary' : 'secondary'} loading={busy === 'draft'} disabled={!base || busy !== null} onClick={() => submit('draft')}>
                  {editing ? 'Salva bozza' : 'Salva in bozza'}
                </Button>
              )}
              {!editing && (
                <Button loading={busy === 'order'} disabled={!ready || busy !== null} onClick={() => submit('order')}>
                  {channel === 'paylink' ? 'Crea link di pagamento' : 'Crea ordine'}
                </Button>
              )}
            </span>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {!editing && context.can.paylink && (
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
              <Select value={sessionId} onValueChange={setSessionId} options={context.sessions.filter((s) => s.status === 'open' || s.status === 'sold_out' || s.id === sessionId).map((s) => ({ value: s.id, label: s.status === 'sold_out' ? `${s.label} · esaurita` : s.label }))} />
            </Field>
          )}
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-label font-medium">{customerNeeded ? 'Cliente' : 'Cliente (facoltativo)'}</legend>
            <Field label="Nome e cognome" required={customerNeeded}>
              <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Email" required={customerNeeded} help={!editing && channel === 'admin' ? 'Serve per mandare il link di pagamento o i biglietti.' : undefined}>
              <Input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Telefono">
              <Input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Codice sconto">
              <Input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} />
            </Field>
          </fieldset>
          {!editing && channel === 'admin' && (
            <Field label="Pagamento" help="Vale per “Crea ordine”. Una bozza sceglie il pagamento quando la confermi.">
              <Select value={pay} onValueChange={setPay} options={PAY_OPTIONS} />
            </Field>
          )}
          {!editing && (
            <Checkbox
              checked={overCapacity}
              onCheckedChange={setOverCapacity}
              label="Crea anche oltre i posti"
              description="Per una data esaurita: l’ordine passa lo stesso e il superamento resta nel registro attività. Una bozza lo chiede quando la confermi."
            />
          )}
          {!editing && channel === 'admin' && pay === 'complimentary' && (
            <Field label="Motivo dell’omaggio" required>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
            </Field>
          )}
          {!editing && (
            <Field label="Note" help="Nota interna: la vedono solo gli operatori.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} />
            </Field>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
