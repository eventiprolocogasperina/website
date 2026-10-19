'use client';

import { Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, ConfirmDialog, Dialog, DialogContent, EmptyState, Field, Input, toast } from '@/components/ui';
import { pairPosDeviceAction, revokePosDeviceAction } from './actions';
import type { AdminDevice, CashAdminData } from './types';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai');

/**
 * Dispositivi di cassa di questa edizione: abbinamento con QR e revoca (come in Sistema › Utenti,
 * filtrato sull'edizione). Dopo l'abbinamento il telefono apre la cassa con nome e PIN.
 */
export function DevicesTab({ data }: { data: CashAdminData }) {
  const [pairing, setPairing] = useState(false);
  const [revoke, setRevoke] = useState<AdminDevice | null>(null);
  const devices = data.devices ?? [];
  const editable = !data.edition.readOnly;

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
              <div>
                <p className="text-section font-semibold">{d.name}</p>
                <p className="text-label text-muted">
                  Abbinato {when(d.createdAt)} · ultimo uso {when(d.lastSeenAt)}
                </p>
                {d.revokedAt && (
                  <Badge tone="neutral" className="mt-1">
                    Revocato
                  </Badge>
                )}
              </div>
              {!d.revokedAt && editable && (
                <Button variant="secondary" size="sm" onClick={() => setRevoke(d)}>
                  Revoca
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pairing && <PairingDialog slug={data.edition.slug} onClose={() => setPairing(false)} />}
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

function PairingDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; qr: string; expiresAt: string } | null>(null);

  async function create() {
    setBusy(true);
    setError('');
    const res = await pairPosDeviceAction(slug, name);
    setBusy(false);
    if (res.ok && res.data) setResult(res.data);
    else if (!res.ok) setError(res.error);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={result ? `Inquadra il QR con “${name}”` : 'Abbina un dispositivo di cassa'}
        description={result ? 'Apri la fotocamera del telefono o del tablet e inquadra il codice. Vale 10 minuti e una sola volta.' : 'Il dispositivo potrà aprire solo la cassa di questa edizione.'}
        footer={
          result ? (
            <Button onClick={onClose}>Fatto</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={create} loading={busy}>
                Genera QR
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.qr} alt="QR di abbinamento" width={240} height={240} className="rounded-lg border border-border bg-white p-2" />
            <p className="text-label text-muted">Dopo l’abbinamento apri {typeof window !== 'undefined' ? window.location.origin : ''}/cassa sul dispositivo.</p>
          </div>
        ) : (
          <Field label="Nome del dispositivo" error={error || undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Es. Telefono cassa 1" />
          </Field>
        )}
      </DialogContent>
    </Dialog>
  );
}
