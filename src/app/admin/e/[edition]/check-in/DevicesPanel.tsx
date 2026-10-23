'use client';

import { QrCode, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { pairDeviceAction, updateDeviceAction } from '@/app/admin/devices-actions';
import { EditDeviceDialog, PairDeviceDialog, permissionSummary } from '@/components/admin/devices/Pairing';
import { Notice } from '@/components/admin/edition/common';
import { Button, Card, ConfirmDialog, EmptyState, StatusBadge, Switch, toast } from '@/components/ui';
import { formatDateTime, formatRelative } from '@/lib/dates';
import type { CheckinStats } from '@/server/domain/checkin';
import type { DeviceRow, RegisterOption } from '@/server/domain/devices';
import type { EditionInfo } from './CheckinClient';
import { revokeScannerAction, setScannerV2Action } from './actions';

type Props = { edition: EditionInfo; devices: DeviceRow[]; registers: RegisterOption[]; stats: CheckinStats['devices']; canManage: boolean; scannerV2: boolean };

/** Telefoni e tablet abbinati come scanner di questa edizione, e interruttore dello scanner nuovo. */
export function DevicesPanel({ edition, devices, registers, stats, canManage, scannerV2 }: Props) {
  const router = useRouter();
  const [pairing, setPairing] = useState(false);
  const [revoke, setRevoke] = useState<DeviceRow | null>(null);
  const [editing, setEditing] = useState<DeviceRow | null>(null);
  const [flagBusy, setFlagBusy] = useState(false);

  if (!canManage) {
    return <Notice>Gli scanner li abbinano il titolare e gli amministratori. Chiedi a loro un QR di abbinamento per il tuo telefono.</Notice>;
  }
  const active = devices.filter((d) => !d.revokedAt);

  return (
    <div className="flex flex-col gap-4">
      <Card
        flush
        title="Scanner abbinati"
        description="Servono almeno due telefoni o tablet per evento. Cosa può fare ognuno si sceglie con il QR e si cambia da qui."
        actions={
          !edition.readOnly ? (
            <Button icon={QrCode} size="sm" onClick={() => setPairing(true)}>
              Abbina scanner
            </Button>
          ) : undefined
        }
      >
        {devices.length === 0 ? (
          <EmptyState icon={Smartphone} title="Nessuno scanner abbinato" description="Abbina i telefoni dei volontari o i tablet: inquadrano un QR e sono pronti." />
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <div className="min-w-48 flex-1">
                  <p className="font-medium text-fg">{d.name}</p>
                  <p className="text-label text-muted">
                    {d.holderName ? `${d.holderName}${d.holderPhone ? ` · ${d.holderPhone}` : ''} · ` : ''}
                    {permissionSummary(d.kind, d.permissions)}
                  </p>
                  <p className="text-caption text-muted">
                    Abbinato il {formatDateTime(d.createdAt)}
                    {d.pairedBy ? ` da ${d.pairedBy}` : ''} · ultimo uso {d.lastSeenAt ? formatRelative(d.lastSeenAt, new Date()) : 'mai'}
                  </p>
                </div>
                <span className="text-label text-muted tabular-nums">{stats.find((s) => s.id === d.id)?.count ?? 0} ingressi nel giorno</span>
                {d.revokedAt ? <StatusBadge status="void" label="Revocato" /> : <StatusBadge status="valid" label="Attivo" />}
                {!d.revokedAt && !edition.readOnly && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(d)}>
                    Modifica
                  </Button>
                )}
                {!d.revokedAt && (
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => setRevoke(d)}>
                    Revoca
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {active.length === 1 && <Notice>C’è un solo scanner attivo: abbinane un secondo, così l’ingresso non si ferma se un telefono si scarica.</Notice>}

      <Card title="Scanner nuovo su /scanner" description="Spento, /scanner resta lo scanner di oggi (vecchie tabelle). Lo scanner nuovo si prova su /scanner/nuovo.">
        <Switch
          checked={scannerV2}
          disabled={flagBusy}
          label="Usa lo scanner nuovo per tutti i dispositivi"
          description="Accendilo solo dopo la migrazione degli ordini dell’edizione (prompt 10): i biglietti venduti dopo non sarebbero riconosciuti."
          onCheckedChange={async (on) => {
            setFlagBusy(true);
            const res = await setScannerV2Action(edition.slug, on);
            setFlagBusy(false);
            if (!res.ok) return toast.error(res.error);
            toast.success(on ? 'Scanner nuovo attivo su /scanner' : 'Su /scanner torna lo scanner di oggi');
            router.refresh();
          }}
        />
      </Card>

      {pairing && (
        <PairDeviceDialog
          editions={[{ slug: edition.slug, title: edition.title }]}
          registersByEdition={{ [edition.slug]: registers }}
          defaultKind="scanner"
          onPair={pairDeviceAction}
          onClose={() => (setPairing(false), router.refresh())}
        />
      )}
      {editing && (
        <EditDeviceDialog
          device={editing}
          registers={registers}
          onSave={async (input) => {
            const res = await updateDeviceAction(editing.id, edition.slug, input, true);
            if (res.ok) {
              toast.success(`“${input.name}” aggiornato: vale da subito.`);
              router.refresh();
            }
            return res;
          }}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!revoke}
        onOpenChange={(o) => !o && setRevoke(null)}
        title={`Revocare “${revoke?.name}”?`}
        description="Il dispositivo esce subito dallo scanner e non potrà rientrare. Gli ingressi già registrati restano."
        confirmLabel="Revoca"
        tone="danger"
        onConfirm={async () => {
          const res = await revokeScannerAction(edition.slug, revoke!.id);
          if (!res.ok) {
            toast.error(res.error);
            throw new Error(res.error);
          }
          toast.success(`“${revoke!.name}” revocato`);
          router.refresh();
        }}
      />
    </div>
  );
}
