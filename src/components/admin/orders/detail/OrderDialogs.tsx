'use client';

import { useState, type ReactNode } from 'react';
import { cancelOrderAction, markPaidAction, moveSessionAction, paylinkFromOrderAction, setBlacklistAction, updateOrderCustomerAction } from '@/app/admin/(org)/ordini/actions';
import { Button, Dialog, DialogContent, Field, Input, Select, Textarea, toast } from '@/components/ui';
import type { ActionResult } from '@/server/admin/run-action';
import { formatMoney } from '@/lib/money';
import type { OrderDetail } from '@/server/domain/orders/admin-detail';

// Finestre delle azioni dell'ordine (menu ⋯). Ognuna chiama una Server Action e si chiude se va bene.

type Props = { d: OrderDetail; onClose: () => void };

type DialogProps = {
  title: string;
  description?: ReactNode;
  confirm: string;
  tone?: 'danger';
  ready: boolean;
  run: () => Promise<ActionResult<unknown>>;
  /** Messaggio quando va bene; senza, ci pensa `onSuccess`. */
  success?: string;
  onSuccess?: (data: unknown) => void;
  onClose: () => void;
  children: ReactNode;
};

function ActionDialog({ title, description, confirm, tone, ready, run, success, onSuccess, onClose, children }: DialogProps) {
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const res = await run();
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    if (success) toast.success(success);
    if (onSuccess) onSuccess(res.data);
    else onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={title}
        description={description}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} disabled={!ready} onClick={submit}>{confirm}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function EditCustomerDialog({ d, onClose }: Props) {
  const [c, setC] = useState({ name: d.customer?.name ?? '', email: d.customer?.email ?? '', phone: d.customer?.phone ?? '' });
  return (
    <ActionDialog
      title="Modifica cliente"
      description="Con un’email diversa l’ordine passa al cliente con quell’email (o a uno nuovo). Il cliente di prima resta com’è."
      confirm="Salva"
      ready={c.name.trim().length > 1 && c.email.includes('@')}
      run={() => updateOrderCustomerAction(d.order.id, c)}
      success="Cliente aggiornato"
      onClose={onClose}
    >
      <Field label="Nome e cognome" required>
        <Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      </Field>
      <Field label="Email" required>
        <Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
      </Field>
      <Field label="Telefono">
        <Input type="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
      </Field>
    </ActionDialog>
  );
}

export function CancelDialog({ d, onClose }: Props) {
  const [reason, setReason] = useState('');
  const paid = d.summary.refundableCents > 0;
  return (
    <ActionDialog
      title={`Annulla ${d.order.code}`}
      description={paid ? `Prima rimborsa ${formatMoney(d.summary.refundableCents)}: un ordine con un importo pagato non si annulla.` : 'I biglietti non varranno più e i posti tornano liberi. L’ordine resta nell’elenco come annullato.'}
      confirm="Annulla ordine"
      tone="danger"
      ready={!paid && reason.trim().length >= 3}
      run={() => cancelOrderAction(d.order.id, reason)}
      success="Ordine annullato"
      onClose={onClose}
    >
      <Field label="Motivo" required>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
      </Field>
    </ActionDialog>
  );
}

export function BlacklistDialog({ d, onClose }: Props) {
  const [reason, setReason] = useState('');
  const on = !d.order.isBlacklisted;
  return (
    <ActionDialog
      title={on ? `Metti ${d.order.code} in blacklist` : `Togli ${d.order.code} dalla blacklist`}
      description={on ? 'L’ordine resta valido ma viene segnalato in elenco, nel registro presenze e ai controlli.' : `Motivo attuale: ${d.order.blacklistReason ?? '—'}`}
      confirm={on ? 'Metti in blacklist' : 'Togli dalla blacklist'}
      tone={on ? 'danger' : undefined}
      ready={!on || reason.trim().length >= 3}
      run={() => setBlacklistAction(d.order.id, on, reason)}
      success={on ? 'Ordine in blacklist' : 'Ordine tolto dalla blacklist'}
      onClose={onClose}
    >
      {on && (
        <Field label="Motivo" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="Es. biglietti rivenduti" />
        </Field>
      )}
    </ActionDialog>
  );
}

export function MarkPaidDialog({ d, onClose }: Props) {
  const [method, setMethod] = useState('bank_transfer');
  return (
    <ActionDialog
      title="Segna come pagato"
      description={`Registra un pagamento di ${formatMoney(d.summary.dueCents)} (l’importo lo calcola il server) e conferma i biglietti.`}
      confirm="Segna pagato"
      ready
      run={() => markPaidAction(d.order.id, method as 'cash' | 'card_pos' | 'bank_transfer')}
      success="Pagamento registrato"
      onClose={onClose}
    >
      <Field label="Come ha pagato">
        <Select
          value={method}
          onValueChange={setMethod}
          options={[
            { value: 'bank_transfer', label: 'Bonifico' },
            { value: 'cash', label: 'Contanti' },
            { value: 'card_pos', label: 'Carta al POS' },
          ]}
        />
      </Field>
    </ActionDialog>
  );
}

export function MoveSessionDialog({ d, onClose }: Props) {
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const options = d.sessions.filter((s) => s.id !== d.order.sessionId && s.status === 'open').map((s) => ({ value: s.id, label: s.label }));
  return (
    <ActionDialog
      title="Sposta data"
      description={`Ora: ${d.order.session?.label ?? 'nessuna data'}. I biglietti passano alla nuova data se ci sono posti.`}
      confirm="Sposta"
      ready={!!to}
      run={() => moveSessionAction(d.order.id, to, reason)}
      success="Data cambiata"
      onClose={onClose}
    >
      <Field label="Nuova data" required>
        <Select value={to} onValueChange={setTo} options={options} placeholder={options.length ? 'Scegli…' : 'Nessuna data aperta'} />
      </Field>
      <Field label="Motivo">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </Field>
    </ActionDialog>
  );
}

/** Modulo paylink: crea l'ordine da pagare con il link (integrazione se l'ordine è già pagato). */
export function PaylinkDialog({ d, products, onClose }: Props & { products: Array<{ id: string; name: string; priceCents: number }> }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [key] = useState(() => crypto.randomUUID());
  const [created, setCreated] = useState<string | null>(null);
  const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([productId, quantity]) => ({ productId, quantity }));
  if (created) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent title="Link di pagamento creato" footer={<Button onClick={onClose}>Fatto</Button>}>
          <p className="text-body">
            Ordine <strong className="font-mono">{created}</strong> creato, in attesa di pagamento. La pagina di pagamento per il cliente arriva con il checkout nuovo: fino ad allora manda il link dalla pagina Ordini di prima.
          </p>
        </DialogContent>
      </Dialog>
    );
  }
  const paid = d.order.status === 'paid' || d.order.status === 'partially_refunded';
  return (
    <ActionDialog
      title="Crea link di pagamento"
      description={paid ? 'Nasce un’integrazione collegata a questo ordine, da pagare con il link.' : 'Nasce un ordine da pagare con il link, per lo stesso cliente e la stessa data.'}
      confirm="Crea"
      ready={lines.length > 0}
      run={() => paylinkFromOrderAction(d.order.id, lines, key)}
      onSuccess={(data) => setCreated(String(data))}
      onClose={onClose}
    >
      {products.length === 0 && <p className="text-body text-muted">Nessun prodotto ha il canale pay-link attivo nel catalogo.</p>}
      {products.map((p) => (
        <Field key={p.id} label={`${p.name} · ${formatMoney(p.priceCents)}`}>
          <Input type="number" min={0} max={50} inputMode="numeric" value={qty[p.id] ?? 0} onChange={(e) => setQty({ ...qty, [p.id]: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} />
        </Field>
      ))}
    </ActionDialog>
  );
}
