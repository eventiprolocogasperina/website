'use client';

import { Archive, ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { itemMovementsAction, saveItemAction } from '@/app/admin/(org)/inventario/actions';
import { FileField } from '@/components/admin/costs/FileField';
import { Button, Field, Input, MoneyInput, Select, Sheet, SheetContent, Textarea, toast } from '@/components/ui';
import { INVENTORY_CATEGORIES, INVENTORY_CONDITION_LABELS, INVENTORY_CONDITIONS, MOVEMENT_LABELS, type InventoryCondition } from '@/lib/costs';
import { formatDate } from '@/lib/dates';
import type { ItemRow } from '@/server/domain/inventory';
import type { EditionOption } from './InventoryClient';
import { MovementDialog, type MovementMode } from './MovementDialog';

type Movement = { id: string; kind: keyof typeof MOVEMENT_LABELS; quantity: number; at: string; returnedAt: string | null; returnedQuantity: number | null; reason: string | null; edition: string | null; by: string | null };

/** Dettaglio del materiale: dati, storico dei movimenti, rettifica, uso per evento, dismissione. */
export function ItemSheet({ row, canWrite, editions, onClose }: { row: ItemRow | null; canWrite: boolean; editions: EditionOption[]; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: row?.name ?? '',
    category: row?.category ?? '',
    quantity: row?.quantity ?? 1,
    unit: row?.unit ?? 'pz',
    location: row?.location ?? '',
    condition: (row?.condition ?? 'good') as InventoryCondition,
    purchasedOn: row?.purchasedOn ?? '',
    purchaseValueCents: row?.purchaseValueCents ?? null,
    notes: row?.notes ?? '',
    photoUrl: row?.photoUrl ?? null,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<MovementMode | null>(null);
  const [moves, setMoves] = useState<Movement[] | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (row) void itemMovementsAction(row.id).then((r) => r.ok && setMoves((r.data ?? []) as Movement[]));
  }, [row]);

  async function submit() {
    setBusy(true);
    setError('');
    const res = await saveItemAction(row?.id ?? null, form);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(row ? 'Materiale salvato' : 'Materiale aggiunto');
    onClose();
    router.refresh();
  }

  const categoryOptions = [...new Set([...INVENTORY_CATEGORIES, ...(row ? [row.category] : [])])].map((c) => ({ value: c, label: c }));
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={row ? row.name : 'Nuovo materiale'}
        description={row ? `${row.quantity} ${row.unit} · ${row.available} disponibili` : undefined}
        size="lg"
        footer={
          canWrite ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Chiudi
              </Button>
              <Button onClick={submit} loading={busy}>
                Salva materiale
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Chiudi
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-4">
          {row && canWrite && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={ArrowRightLeft} onClick={() => setMode('assign')} disabled={row.available <= 0}>
                Porta a un evento
              </Button>
              <Button size="sm" variant="secondary" icon={SlidersHorizontal} onClick={() => setMode('adjust')}>
                Rettifica quantità
              </Button>
              <Button size="sm" variant="ghost" icon={Archive} onClick={() => setMode('dismiss')}>
                Dismetti
              </Button>
            </div>
          )}
          <fieldset disabled={!canWrite} className="flex flex-col gap-4">
            <Field label="Nome" required>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Es. Gazebo 3x3 bianco" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria" required>
                <Select value={form.category || undefined} onValueChange={(category) => set({ category })} options={categoryOptions} disabled={!canWrite} />
              </Field>
              <Field label="Stato">
                <Select value={form.condition} onValueChange={(v) => set({ condition: v as InventoryCondition })} options={INVENTORY_CONDITIONS.map((c) => ({ value: c, label: INVENTORY_CONDITION_LABELS[c] }))} disabled={!canWrite} />
              </Field>
              <Field label="Quantità" help={row ? 'Cambia con “Rettifica quantità”.' : undefined}>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => set({ quantity: Number(e.target.value) })} disabled={!!row} />
              </Field>
              <Field label="Unità">
                <Input value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="pz, m, kg" />
              </Field>
            </div>
            <Field label="Dove si trova">
              <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Es. magazzino comunale, scaffale 2" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Acquistato il">
                <Input type="date" value={form.purchasedOn} onChange={(e) => set({ purchasedOn: e.target.value })} />
              </Field>
              <Field label="Valore d’acquisto">
                <MoneyInput value={form.purchaseValueCents} onValueChange={(purchaseValueCents) => set({ purchaseValueCents })} />
              </Field>
            </div>
            <FileField label="Foto" value={form.photoUrl} onChange={(photoUrl) => set({ photoUrl })} folder="pro-loco-gasperina/inventario" accept="image/png,image/jpeg,image/webp" />
            <Field label="Note">
              <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} />
            </Field>
          </fieldset>
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
          {row && (
            <section aria-label="Movimenti">
              <h3 className="mb-2 text-label font-medium text-muted">Movimenti</h3>
              {!moves ? (
                <p className="text-body text-muted">Carico…</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {moves.map((m) => (
                    <li key={m.id} className="px-3 py-2 text-body">
                      <span className="text-fg">
                        {MOVEMENT_LABELS[m.kind]}
                        {m.edition ? ` · ${m.edition}` : ''} · {m.kind === 'event_use' ? m.quantity : m.quantity > 0 ? `+${m.quantity}` : m.quantity} {row.unit}
                      </span>
                      <span className="block text-label text-muted">
                        {formatDate(m.at, 'short')}
                        {m.by ? ` · ${m.by}` : ''}
                        {m.kind === 'event_use' ? (m.returnedAt ? ` · rientrati ${m.returnedQuantity}` : ' · non ancora rientrato') : ''}
                        {m.reason ? ` · ${m.reason}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        {row && mode && (
          <MovementDialog
            mode={mode}
            item={row}
            editions={editions}
            onClose={() => setMode(null)}
            onDone={() => {
              onClose();
              router.refresh();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
