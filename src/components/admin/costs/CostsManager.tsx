'use client';

import { Paperclip, Plus, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { saveCostAction, voidCostAction } from '@/app/admin/(org)/costi/actions';
import { Badge, Button, ConfirmDialog, DataTable, dataTableColumns, EmptyState, Field, Input, Select, toast } from '@/components/ui';
import { COST_CATEGORIES, COST_PAYMENT_LABELS } from '@/lib/costs';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { CostRow } from '@/server/domain/costs';
import { CostSheet } from './CostSheet';

export type CostsManagerProps = {
  /** Slug dell'edizione, o null per i costi generali. */
  edition: string | null;
  rows: CostRow[];
  canWrite: boolean;
  /** Edizione conclusa o archiviata: sola lettura. */
  locked: boolean;
  items: Array<{ id: string; name: string }>;
};

/** Elenco dei costi con filtro, nuovo costo, modifica e annullamento (mai cancellazione). */
export function CostsManager({ edition, rows, canWrite, locked, items }: CostsManagerProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<CostRow | 'new' | null>(null);
  const [voiding, setVoiding] = useState<CostRow | null>(null);
  const [reason, setReason] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const writable = canWrite && !locked;

  const shown = rows.filter((r) => (category === 'all' || r.category === category) && (!q || `${r.description} ${r.supplier ?? ''} ${r.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  const columns = useMemo(() => {
    const col = dataTableColumns<CostRow>();
    return [
      col.accessor('spentOn', { header: 'Data', meta: { label: 'Data' }, size: 120, cell: (c) => formatDate(c.getValue(), 'short') }),
      col.accessor('description', {
        header: 'Descrizione',
        meta: { label: 'Descrizione' },
        size: 280,
        cell: (c) => {
          const r = c.row.original;
          return (
            <span className={r.voidedAt ? 'text-muted line-through' : 'text-fg'}>
              {c.getValue()}
              {r.attachmentUrl && <Paperclip size={13} aria-label="con allegato" className="ml-1 inline text-muted" />}
              {r.supplier && <span className="block text-label text-muted no-underline">{r.supplier}</span>}
            </span>
          );
        },
      }),
      col.accessor('category', { header: 'Categoria', meta: { label: 'Categoria' }, size: 170 }),
      col.accessor('amountCents', { header: 'Importo', meta: { label: 'Importo' }, size: 110, cell: (c) => <span className={c.row.original.voidedAt ? 'text-muted line-through tabular-nums' : 'tabular-nums'}>{formatMoney(c.getValue())}</span> }),
      col.display({
        id: 'state',
        header: 'Stato',
        meta: { label: 'Stato' },
        size: 150,
        cell: (c) => {
          const r = c.row.original;
          if (r.voidedAt) return <Badge tone="neutral">Annullato</Badge>;
          return <Badge tone={r.paid ? 'success' : 'warning'}>{r.paid ? `Pagato · ${COST_PAYMENT_LABELS[r.paymentMethod]}` : 'Da pagare'}</Badge>;
        },
      }),
    ];
  }, []);

  async function confirmVoid() {
    if (!voiding) return;
    const res = await voidCostAction(edition, voiding.id, reason);
    if (!res.ok) return void toast.error(res.error);
    toast.success('Costo annullato');
    setReason('');
    router.refresh();
  }

  return (
    <>
      <DataTable
        label="Costi"
        data={shown}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={setEditing}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca descrizione o fornitore" aria-label="Cerca nei costi" className="w-56" />
            <Select value={category} onValueChange={setCategory} options={[{ value: 'all', label: 'Tutte le categorie' }, ...COST_CATEGORIES.map((c) => ({ value: c, label: c }))]} className="w-52" />
            {writable && (
              <Button icon={Plus} size="sm" onClick={() => setEditing('new')}>
                Aggiungi costo
              </Button>
            )}
          </div>
        }
        empty={
          <EmptyState
            icon={Wallet}
            title={rows.length ? 'Nessun costo con questi filtri' : 'Nessun costo ancora'}
            description={locked ? 'L’edizione è conclusa: i costi sono in sola lettura.' : 'Registra spese, noleggi, permessi e rimborsi ai volontari, con la ricevuta se ce l’hai.'}
            action={writable && !rows.length ? <Button onClick={() => setEditing('new')}>Aggiungi costo</Button> : undefined}
          />
        }
      />
      {editing && (
        <CostSheet
          edition={edition}
          row={editing === 'new' ? null : editing}
          readOnly={!writable || (editing !== 'new' && !!editing.voidedAt)}
          items={items}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            const res = await saveCostAction(edition, editing === 'new' ? null : editing.id, input);
            if (!res.ok) return res.error;
            toast.success(editing === 'new' ? 'Costo registrato' : 'Costo salvato');
            setEditing(null);
            router.refresh();
            return null;
          }}
          onVoid={editing !== 'new' ? () => (setVoiding(editing), setEditing(null)) : undefined}
        />
      )}
      <ConfirmDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title="Annullare il costo?"
        description="La voce resta nell’elenco, barrata, e non conta più nei totali. Non si cancella."
        confirmLabel="Annulla costo"
        cancelLabel="Tienilo"
        onConfirm={confirmVoid}
      >
        <Field label="Motivo" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Es. fattura registrata due volte" />
        </Field>
      </ConfirmDialog>
    </>
  );
}
