'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { returnItemAction } from '@/app/admin/(org)/inventario/actions';
import { Badge, Button, ButtonLink, Card, ConfirmDialog, Field, Input, toast } from '@/components/ui';
import type { EditionMaterial } from '@/server/domain/inventory';

/** "Materiale usato" dell'edizione: cosa è uscito dall'inventario, cosa è rientrato, cosa manca. */
export function MaterialsCard({ rows, canWrite }: { rows: EditionMaterial[]; canWrite: boolean }) {
  const router = useRouter();
  const [returning, setReturning] = useState<EditionMaterial | null>(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  function open(m: EditionMaterial) {
    setReturning(m);
    setQty(String(m.quantity));
    setReason('');
  }

  async function confirm() {
    if (!returning) return;
    const res = await returnItemAction(returning.id, Number(qty), reason);
    if (!res.ok) return void toast.error(res.error);
    toast.success(res.data?.missing ? `Rientrato, mancano ${res.data.missing} ${returning.unit}` : 'Rientrato tutto');
    router.refresh();
  }

  const missing = returning ? returning.quantity - Number(qty || 0) : 0;
  return (
    <Card
      title="Materiale usato"
      description="Dall’inventario: quello che è uscito per l’evento e cosa manca al rientro."
      flush
      actions={canWrite ? <ButtonLink href="/admin/inventario" variant="secondary" size="sm">Porta materiale</ButtonLink> : undefined}
    >
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-body text-muted">Nessun materiale assegnato a questa edizione. Si assegna da Inventario → “Porta a un evento”.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="text-body text-fg">
                {m.itemName} · {m.quantity} {m.unit}
                {m.reason && <span className="block text-label text-muted">{m.reason}</span>}
              </span>
              {m.returnedAt ? (
                m.missing ? <Badge tone="danger">Mancano {m.missing} {m.unit}</Badge> : <Badge tone="success">Rientrato</Badge>
              ) : canWrite ? (
                <Button size="sm" variant="secondary" onClick={() => open(m)}>
                  Segna rientrato
                </Button>
              ) : (
                <Badge tone="warning">Fuori</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!returning}
        onOpenChange={(o) => !o && setReturning(null)}
        title={`Rientro: ${returning?.itemName ?? ''}`}
        description={`Erano usciti ${returning?.quantity ?? 0} ${returning?.unit ?? ''}. I pezzi che mancano escono dall’inventario come persi.`}
        confirmLabel="Segna rientrato"
        tone="primary"
        onConfirm={confirm}
      >
        <div className="flex flex-col gap-3">
          <Field label="Pezzi rientrati" required>
            <Input type="number" min={0} max={returning?.quantity} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          {missing > 0 && (
            <Field label="Cosa è successo ai mancanti" required>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Es. due rotti nello smontaggio" />
            </Field>
          )}
        </div>
      </ConfirmDialog>
    </Card>
  );
}
