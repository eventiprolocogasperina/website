'use client';

import { QrCode, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Notice } from '@/components/admin/edition/common';
import { Button, Card, ConfirmDialog, Dialog, DialogContent, EmptyState, Field, Input, StatusBadge, Switch, toast } from '@/components/ui';
import { formatDateTime, formatRelative } from '@/lib/dates';
import type { CheckinStats } from '@/server/domain/checkin';
import type { DeviceRow } from '@/server/domain/devices';
import type { EditionInfo } from './CheckinClient';
import { pairScannerAction, revokeScannerAction, setScannerV2Action } from './actions';

type Props = { edition: EditionInfo; devices: DeviceRow[]; stats: CheckinStats['devices']; canManage: boolean; scannerV2: boolean };

/** Telefoni e tablet abbinati come scanner di questa edizione, e interruttore dello scanner nuovo. */
export function DevicesPanel({ edition, devices, stats, canManage, scannerV2 }: Props) {
  const router = useRouter();
  const [pairing, setPairing] = useState(false);
  const [revoke, setRevoke] = useState<DeviceRow | null>(null);
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
        description="Servono almeno due telefoni o tablet per evento. Ogni volontario entra con il proprio PIN."
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
                    Abbinato il {formatDateTime(d.createdAt)}
                    {d.pairedBy ? ` da ${d.pairedBy}` : ''} · ultimo uso {d.lastSeenAt ? formatRelative(d.lastSeenAt, new Date()) : 'mai'}
                  </p>
                </div>
                <span className="text-label text-muted tabular-nums">{stats.find((s) => s.id === d.id)?.count ?? 0} ingressi nel giorno</span>
                {d.revokedAt ? <StatusBadge status="void" label="Revocato" /> : <StatusBadge status="valid" label="Attivo" />}
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

      {pairing && <PairDialog edition={edition.slug} onClose={() => (setPairing(false), router.refresh())} />}
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

function PairDialog({ edition, onClose }: { edition: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; qr: string; expiresAt: string } | null>(null);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={result ? `Inquadra il QR con “${name}”` : 'Abbina uno scanner'}
        description={result ? 'Apri la fotocamera del telefono o del tablet e inquadra il codice. Vale una volta sola.' : 'Il QR vale 10 minuti e una sola volta.'}
        footer={
          result ? (
            <Button onClick={onClose}>Fatto</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Annulla
              </Button>
              <Button
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  const res = await pairScannerAction(edition, name);
                  setBusy(false);
                  if (!res.ok) return setError(res.error);
                  if (res.data) setResult(res.data);
                }}
              >
                Genera QR
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.qr} alt="QR di abbinamento" width={240} height={240} className="rounded-lg border border-border bg-white p-2" />
            <Countdown until={result.expiresAt} />
            <details className="w-full text-left text-caption text-muted">
              <summary className="cursor-pointer">Non riesci a inquadrarlo?</summary>
              <p className="mt-1 break-all">Apri questo indirizzo sul dispositivo: {result.url}</p>
            </details>
          </div>
        ) : (
          <Field label="Nome dello scanner" help="Come lo riconosci all’evento, es. “Ingresso nord” o “Telefono di Anna”." required error={error || undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={60} />
          </Field>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return <p className="text-label text-muted">{left ? `Vale ancora ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Scaduto: generane uno nuovo.'}</p>;
}
