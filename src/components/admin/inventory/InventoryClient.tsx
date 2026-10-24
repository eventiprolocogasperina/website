'use client';

import { Package, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, DataTable, dataTableColumns, EmptyState, Input, PageHeader, Select } from '@/components/ui';
import { INVENTORY_CONDITION_LABELS, INVENTORY_CONDITIONS, type InventoryCondition } from '@/lib/costs';
import type { ItemRow } from '@/server/domain/inventory';
import { ItemSheet } from './ItemSheet';

export type EditionOption = { id: string; title: string };

const CONDITION_TONE: Record<InventoryCondition, 'success' | 'warning' | 'danger'> = { good: 'success', needs_repair: 'warning', broken: 'danger' };

export function InventoryClient({ items, canWrite, editions }: { items: ItemRow[]; canWrite: boolean; editions: EditionOption[] }) {
  const [editing, setEditing] = useState<ItemRow | 'new' | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [condition, setCondition] = useState('all');
  const categories = [...new Set(items.map((i) => i.category))].sort();

  const shown = items.filter(
    (i) =>
      (category === 'all' || i.category === category) &&
      (condition === 'all' || i.condition === condition) &&
      (!q || `${i.name} ${i.location ?? ''} ${i.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  );

  const columns = useMemo(() => {
    const col = dataTableColumns<ItemRow>();
    return [
      col.accessor('name', {
        header: 'Materiale',
        meta: { label: 'Materiale' },
        size: 260,
        cell: (c) => (
          <span className="text-fg">
            <span className="font-medium">{c.getValue()}</span>
            <span className="block text-label text-muted">{c.row.original.category}</span>
          </span>
        ),
      }),
      col.accessor('quantity', {
        header: 'Quantità',
        meta: { label: 'Quantità' },
        size: 150,
        cell: (c) => {
          const r = c.row.original;
          return (
            <span className="tabular-nums">
              {r.quantity} {r.unit}
              {r.out > 0 && <span className="block text-label text-warning">{r.out} fuori per eventi</span>}
            </span>
          );
        },
      }),
      col.accessor('location', { header: 'Dove si trova', meta: { label: 'Dove si trova' }, size: 200, cell: (c) => c.getValue() ?? <span className="text-muted">—</span> }),
      col.accessor('condition', { header: 'Stato', meta: { label: 'Stato' }, size: 130, cell: (c) => <Badge tone={CONDITION_TONE[c.getValue()]}>{INVENTORY_CONDITION_LABELS[c.getValue()]}</Badge> }),
    ];
  }, []);

  return (
    <>
      <PageHeader
        title="Inventario"
        count={items.length}
        subtitle="Il materiale della Pro Loco: dove si trova, in che stato, cosa è uscito per gli eventi e cosa manca."
        primaryAction={
          canWrite ? (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Aggiungi materiale
            </Button>
          ) : undefined
        }
      />
      <DataTable
        label="Inventario"
        data={shown}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={setEditing}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome o posto" aria-label="Cerca nell’inventario" className="w-56" />
            <Select value={category} onValueChange={setCategory} options={[{ value: 'all', label: 'Tutte le categorie' }, ...categories.map((c) => ({ value: c, label: c }))]} className="w-48" />
            <Select value={condition} onValueChange={setCondition} options={[{ value: 'all', label: 'Ogni stato' }, ...INVENTORY_CONDITIONS.map((c) => ({ value: c, label: INVENTORY_CONDITION_LABELS[c] }))]} className="w-40" />
          </div>
        }
        empty={
          <EmptyState
            icon={Package}
            title={items.length ? 'Nessun materiale con questi filtri' : 'Inventario vuoto'}
            description="Aggiungi gazebo, tavoli, prolunghe, pentole: per ognuno quanti sono e dove si trovano."
            action={canWrite && !items.length ? <Button onClick={() => setEditing('new')}>Aggiungi materiale</Button> : undefined}
          />
        }
      />
      {editing && <ItemSheet key={editing === 'new' ? 'new' : editing.id} row={editing === 'new' ? null : editing} canWrite={canWrite} editions={editions} onClose={() => setEditing(null)} />}
    </>
  );
}
