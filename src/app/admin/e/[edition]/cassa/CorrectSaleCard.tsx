'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Field, Input, Select, Textarea, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { CorrectableMethod, SaleLookup } from '@/server/domain/cash/correct';
import { changeSaleMethodAction, findSalesByNumberAction } from './actions';

const METHODS: Array<{ value: CorrectableMethod; label: string }> = [
  { value: 'cash', label: 'Contanti' },
  { value: 'card_pos', label: 'Carta (POS)' },
];
const label = (m: CorrectableMethod) => METHODS.find((x) => x.value === m)!.label;
const when = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Correzione del metodo di un contributo (contanti ↔ POS), cercato per numero progressivo. */
export function CorrectSaleCard({ edition }: { edition: string }) {
  const [number, setNumber] = useState('');
  const [found, setFound] = useState<SaleLookup[] | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    const n = Number(number);
    if (!Number.isInteger(n) || n <= 0) return toast.error('Scrivi il numero della vendita.');
    setSearching(true);
    const res = await findSalesByNumberAction(edition, n);
    setSearching(false);
    if (res.ok) setFound(res.data);
    else toast.error(res.error);
  };

  return (
    <Card title="Correggi il metodo di pagamento" description="Per un contributo incassato col POS ma registrato in contanti, o il contrario. L’importo non cambia e la correzione resta nel registro attività.">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <Field label="Numero della vendita" className="w-40">
          <Input value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Es. 31" />
        </Field>
        <Button type="submit" variant="secondary" icon={Search} loading={searching}>
          Cerca
        </Button>
      </form>
      {found && found.length === 0 && <p className="mt-3 text-body text-muted">Nessuna vendita con questo numero.</p>}
      {found && found.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {found.map((s) => (
            <SaleRow key={s.orderId} edition={edition} sale={s} onDone={(method) => setFound(found.map((x) => (x.orderId === s.orderId ? { ...x, method } : x)))} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function SaleRow({ edition, sale, onDone }: { edition: string; sale: SaleLookup; onDone: (method: CorrectableMethod) => void }) {
  const other = sale.method === 'cash' ? 'card_pos' : 'cash';
  const [method, setMethod] = useState<CorrectableMethod>(other);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await changeSaleMethodAction(edition, sale.orderId, method, reason);
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Vendita ${sale.number ?? sale.code}: ora ${label(res.data.to)}`);
    setReason('');
    onDone(res.data.to);
  };

  return (
    <li className="rounded-xl border border-border bg-surface p-3 text-body">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-title font-bold tabular-nums">{sale.number ?? sale.code}</span>
        <span className="text-muted">
          {sale.register} · {when(sale.at)} · {formatMoney(sale.totalCents)}
        </span>
        {sale.method && <Badge>{label(sale.method)}</Badge>}
        {sale.voided && <Badge tone="danger">Annullata</Badge>}
        {sale.sessionClosed && <Badge>Turno chiuso</Badge>}
      </div>
      {sale.items && <p className="mt-1 text-label text-muted">{sale.items}</p>}
      {sale.voided ? null : !sale.method ? (
        <p className="mt-2 text-label text-muted">Questa vendita non si corregge da qui: è un omaggio, ha più pagamenti o un rimborso.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <Field label="Metodo giusto" className="w-56">
            <Select value={method} onValueChange={(v) => setMethod(v as CorrectableMethod)} options={METHODS} />
          </Field>
          <Field label="Motivo" required>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Es. pagato col POS, registrato in contanti per errore" />
          </Field>
          <Button className="self-start" loading={saving} disabled={method === sale.method || reason.trim().length < 3} onClick={() => void save()}>
            Correggi in {label(method)}
          </Button>
        </div>
      )}
    </li>
  );
}
