'use client';

import { Smartphone } from 'lucide-react';
import { useState } from 'react';
import { EditDeviceDialog, PairDeviceDialog, permissionSummary } from '@/components/admin/devices/Pairing';
import { Badge, Button, Card, ConfirmDialog, EmptyState, toast } from '@/components/ui';
import { pairDeviceAction, updateDeviceAction } from '@/app/admin/devices-actions';
import { revokePosDeviceAction } from './actions';
import type { AdminDevice, CashAdminData } from './types';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai');

/**
 * Dispositivi di cassa di questa edizione: abbinamento con QR (già con persona, cassa e permessi),
 * modifica e revoca, come in Sistema › Utenti ma filtrati sull'edizione.
 */
export function DevicesTab({ data }: { data: CashAdminData }) {
  const [pairing, setPairing] = useState(false);
  const [editing, setEditing] = useState<AdminDevice | null>(null);
  const [revoke, setRevoke] = useState<AdminDevice | null>(null);
  const devices = data.devices ?? [];
  const editable = !data.edition.readOnly;
  const registers = data.registers.map((r) => ({ id: r.id, name: r.name, active: r.active, allowOpenAmount: r.allowOpenAmount }));
  const slug = data.edition.slug;

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-body text-muted">Telefoni e tablet che possono aprire la cassa di {data.edition.title}.</p>
        {editable && <Button onClick={() => setPairing(true)}>Abbina dispositivo</Button>}
      </div>
      {devices.length === 0 ? (
        <Card>
          <EmptyState icon={Smartphone} title="Nessun dispositivo di cassa abbinato" description="Abbina almeno due telefoni o tablet: possono lavorare sulla stessa cassa o su casse diverse." />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {devices.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="min-w-0">
                <p className="text-section font-semibold">{d.name}</p>
                <p className="text-label text-muted">
                  {d.registerName ?? 'Nessuna cassa assegnata'}
                  {d.holderName ? ` · ${d.holderName}` : ''}
                  {d.holderPhone ? ` · ${d.holderPhone}` : ''}
                </p>
                <p className="text-label text-muted">{permissionSummary(d.kind, d.permissions)}</p>
                <p className="text-caption text-muted">
                  Abbinato {when(d.createdAt)} · ultimo uso {when(d.lastSeenAt)}
                </p>
                {d.revokedAt && (
                  <Badge tone="neutral" className="mt-1">
                    Revocato
                  </Badge>
                )}
              </div>
              {!d.revokedAt && editable && (
                <div className="flex shrink-0 flex-col gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(d)}>
                    Modifica
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => setRevoke(d)}>
                    Revoca
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {pairing && (
        <PairDeviceDialog
          editions={[{ slug, title: data.edition.title }]}
          registersByEdition={{ [slug]: registers }}
          defaultKind="pos"
          onPair={pairDeviceAction}
          onClose={() => setPairing(false)}
        />
      )}
      {editing && (
        <EditDeviceDialog
          device={editing}
          registers={registers}
          onSave={async (input) => {
            const res = await updateDeviceAction(editing.id, slug, input, true);
            if (res.ok) toast.success(`“${input.name}” aggiornato: vale da subito.`);
            return res;
          }}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!revoke}
        onOpenChange={(o) => !o && setRevoke(null)}
        title={`Revocare “${revoke?.name}”?`}
        description="Il dispositivo esce subito dalla cassa e non potrà rientrare. Per usarlo di nuovo va abbinato con un nuovo QR."
        confirmLabel="Revoca dispositivo"
        onConfirm={async () => {
          if (!revoke) return;
          const res = await revokePosDeviceAction(data.edition.slug, revoke.id);
          if (!res.ok) {
            toast.error(res.error);
            throw new Error(res.error);
          }
          toast.success(`“${revoke.name}” è stato revocato.`);
        }}
      />
    </div>
  );
}
