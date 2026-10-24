'use client';

import { useState } from 'react';
import { adjustItemAction, assignItemAction, dismissItemAction } from '@/app/admin/(org)/inventario/actions';
import { ConfirmDialog, Field, Input, Select, toast } from '@/components/ui';
import { ADJUSTMENT_KINDS, MOVEMENT_LABELS, type AdjustmentKind } from '@/lib/costs';
import type { ItemRow } from '@/server/domain/inventory';
import type { EditionOption } from './InventoryClient';

export type MovementMode = 'assign' | 'adjust' | 'dismiss';

const TITLES: Record<MovementMode, string> = { assign: 'Porta a un evento', adjust: 'Rettifica quantità', dismiss: 'Dismettere il materiale?' };

/** Uso per evento, rettifica (perso, rotto, aggiunta, correzione) o dismissione, sempre con il motivo. */
export function MovementDialog({ mode, item, editions, onClose, onDone }: { mode: MovementMode; item: ItemRow; editions: EditionOption[]; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState(mode === 'assign' ? String(item.available) : '1');
  const [kind, setKind] = useState<AdjustmentKind>('lost');
  const [editionId, setEditionId] = useState(editions[0]?.id ?? '');
  const [reason, setReason] = useState('');

  async function confirm() {
    const quantity = Number(qty);
    const res =
      mode === 'assign'
        ? await assignItemAction(item.id, { editionId, quantity, reason })
        : mode === 'adjust'
          ? await adjustItemAction(item.id, { kind, quantity, reason })
          : await dismissItemAction(item.id, reason);
    if (!res.ok) return void toast.error(res.error);
    toast.success(mode === 'assign' ? 'Materiale assegnato all’evento' : mode === 'adjust' ? 'Quantità rettificata' : 'Materiale dismesso');
    onDone();
  }

  const description =
    mode === 'assign'
      ? `Disponibili ${item.available} ${item.unit}. Al rientro lo segni dalla pagina Costi e rendiconto dell’edizione.`
      : mode === 'adjust'
        ? `Oggi ${item.quantity} ${item.unit}. Perso e rotto tolgono pezzi; per la correzione scrivi + o − (es. -2).`
        : 'Il materiale esce dall’inventario ma resta nello storico, con i suoi movimenti. Non si cancella.';
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={TITLES[mode]}
      description={description}
      confirmLabel={mode === 'assign' ? 'Porta all’evento' : mode === 'adjust' ? 'Salva rettifica' : 'Dismetti materiale'}
      tone={mode === 'dismiss' ? 'danger' : 'primary'}
      onConfirm={confirm}
    >
      <div className="flex flex-col gap-3">
        {mode === 'assign' && (
          <Field label="Edizione" required>
            <Select value={editionId || undefined} onValueChange={setEditionId} options={editions.map((e) => ({ value: e.id, label: e.title }))} />
          </Field>
        )}
        {mode === 'adjust' && (
          <Field label="Tipo" required>
            <Select value={kind} onValueChange={(v) => setKind(v as AdjustmentKind)} options={ADJUSTMENT_KINDS.map((k) => ({ value: k, label: MOVEMENT_LABELS[k] }))} />
          </Field>
        )}
        {mode !== 'dismiss' && (
          <Field label="Quantità" required>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        )}
        <Field label={mode === 'assign' ? 'Nota' : 'Motivo'} required={mode !== 'assign'}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === 'assign' ? 'Es. stand cucina' : 'Es. rotto durante lo smontaggio'} />
        </Field>
      </div>
    </ConfirmDialog>
  );
}
