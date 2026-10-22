'use client';

import { Hash, Pencil, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, IconButton, Input, Sheet, SheetContent, Switch, toast } from '@/components/ui';
import { resetNumberingAction, saveRegisterAction, setRegisterActiveAction } from './actions';
import type { AdminRegister, CashAdminData } from './types';

const time = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Scheda Casse: elenco, nuova cassa, accesa/spenta e numerazione degli ordini. */
export function RegistersTab({ data }: { data: CashAdminData }) {
  const [editing, setEditing] = useState<AdminRegister | 'new' | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [startFrom, setStartFrom] = useState('1');
  const editable = data.can.edit && !data.edition.readOnly;
  const slug = data.edition.slug;

  async function toggle(r: AdminRegister, active: boolean) {
    const res = await setRegisterActiveAction(slug, r.id, active);
    if (res.ok) toast.success(active ? `${r.name} accesa` : `${r.name} spenta`);
    else toast.error(res.error);
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card
        title="Numero da chiamare"
        description="Le casse che danno il numero usano un unico contatore per l’edizione. Puoi farlo ripartire, per esempio all’inizio di una nuova giornata: nessun ordine viene cancellato."
        actions={
          editable && (
            <Button variant="secondary" icon={Hash} onClick={() => setResetOpen(true)}>
              Riparti da…
            </Button>
          )
        }
      >
        <p className="text-body">
          Prossimo numero: <strong className="text-title tabular-nums">{data.nextNumber}</strong>
        </p>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-section font-semibold">Casse</h2>
        {editable && (
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Nuova cassa
          </Button>
        )}
      </div>

      {data.registers.length === 0 ? (
        <Card>
          <EmptyState icon={Store} title="Ancora nessuna cassa" description="Crea una cassa per ogni postazione: “Cassa 1”, “Bar”. I telefoni dei volontari scelgono la cassa all’apertura del turno." />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.registers.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-section font-semibold">{r.name}</h3>
                  <p className="text-label text-muted">{r.productIds ? `${r.productIds.length} prodotti` : 'Tutti i prodotti della cassa'}</p>
                </div>
                {editable && <IconButton icon={Pencil} label={`Modifica ${r.name}`} size="sm" onClick={() => setEditing(r)} />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={r.active ? 'success' : 'neutral'}>{r.active ? 'Attiva' : 'Spenta'}</Badge>
                {r.issuesNumbers && <Badge tone="info">Dà il numero</Badge>}
                {r.allowOpenAmount && <Badge tone="info">Altro (importo libero)</Badge>}
                {r.openSince && <Badge tone="warning">Turno aperto dal {time(r.openSince)}</Badge>}
              </div>
              {editable && <Switch label="Cassa attiva sui dispositivi" checked={r.active} onCheckedChange={(v) => toggle(r, v)} />}
            </li>
          ))}
        </ul>
      )}

      {editing && <RegisterSheet slug={slug} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        tone="primary"
        title="Far ripartire la numerazione?"
        description="Il prossimo ordine avrà il numero che scegli. Gli ordini già fatti tengono il loro numero."
        confirmLabel="Riparti"
        onConfirm={async () => {
          const res = await resetNumberingAction(slug, Number(startFrom));
          if (!res.ok) {
            toast.error(res.error);
            throw new Error(res.error);
          }
          toast.success(`Il prossimo numero è ${startFrom}`);
        }}
      >
        <Field label="Prossimo numero">
          <Input inputMode="numeric" value={startFrom} onChange={(e) => setStartFrom(e.target.value.replace(/\D/g, '').slice(0, 5))} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

function RegisterSheet({ slug, item, onClose }: { slug: string; item: AdminRegister | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [issuesNumbers, setIssuesNumbers] = useState(item?.issuesNumbers ?? true);
  const [active, setActive] = useState(item?.active ?? true);
  const [allowOpenAmount, setAllowOpenAmount] = useState(item?.allowOpenAmount ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError('');
    const res = await saveRegisterAction(slug, item?.id ?? null, { name, issuesNumbers, active, allowOpenAmount, productIds: item?.productIds ?? null });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(item ? 'Cassa aggiornata' : 'Cassa creata');
    onClose();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={item ? item.name : 'Nuova cassa'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={save} loading={busy}>
              Salva
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome" required error={error || undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Es. Cassa 1, Bar" />
          </Field>
          <Checkbox label="Dà il numero da chiamare" description="Spegnilo per le casse che non preparano niente (es. solo bevande al banco)." checked={issuesNumbers} onCheckedChange={setIssuesNumbers} />
          <Checkbox
            label="Pulsante “Altro” (importo libero)"
            description="Il cassiere digita un importo a mano, per offerte o cose fuori listino. Lascialo spento sulle casse che vendono solo dal listino."
            checked={allowOpenAmount}
            onCheckedChange={setAllowOpenAmount}
          />
          <Checkbox label="Attiva" description="Una cassa spenta non compare sui telefoni. I turni passati restano." checked={active} onCheckedChange={setActive} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
