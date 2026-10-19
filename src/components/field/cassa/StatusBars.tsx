'use client';

import { Bluetooth, CloudOff, Loader2, Printer, RefreshCw, Usb } from 'lucide-react';
import { useState } from 'react';
import { Button, Dialog, DialogContent } from '@/components/ui';
import type { QueuedSale } from '@/lib/cash/offline-queue';
import type { PrinterSettings } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import { bluetoothPrinter } from '@/lib/printer/bluetoothPrinter';
import { generateTestTicketEscpos } from '@/lib/printer/escpos';
import { toPrinterSettings } from '@/lib/cash/receipt';
import { usePrinter } from './printing';

type QueueProps = { online: boolean; pending: number; failed: QueuedSale[]; syncing: boolean; onSync: () => void; onRetry: (key: string) => void };

/** Banner della rete e della coda (§12.1 punto 7): quante vendite aspettano di partire. */
export function OfflineBanner({ online, pending, failed, syncing, onSync, onRetry }: QueueProps) {
  if (online && pending === 0 && failed.length === 0) return null;
  return (
    <div role="status" className="border-b border-warning bg-warning-bg px-4 py-2 text-body">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <CloudOff size={18} aria-hidden className="shrink-0" />
        <span className="flex-1">
          {!online ? 'Sei offline: le vendite restano sul telefono. ' : ''}
          {pending > 0 ? `${pending} ${pending === 1 ? 'ordine' : 'ordini'} in coda.` : !online ? 'Nessun ordine in coda.' : ''}
        </span>
        {online && pending > 0 && (
          <Button variant="secondary" size="sm" onClick={onSync} loading={syncing} icon={RefreshCw}>
            Invia ora
          </Button>
        )}
      </div>
      {failed.length > 0 && (
        <ul className="mx-auto mt-2 max-w-6xl space-y-1">
          {failed.map((f) => (
            <li key={f.key} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2 text-label">
              <span className="flex-1">
                Vendita delle {new Date(f.payload.offlineAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} ({formatMoney(f.totalCents)}) non accettata: {f.failed}. Chiama un responsabile.
              </span>
              <Button variant="secondary" size="sm" onClick={() => onRetry(f.key)}>
                Riprova
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Collega la stampante termica (Bluetooth su Android, seriale su computer). Su iPhone il Bluetooth web non c'è. */
export function PrinterButton({ settings }: { settings: PrinterSettings }) {
  const state = usePrinter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={state.connected ? `Stampante collegata: ${state.deviceName ?? ''}` : 'Collega la stampante'}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface-sunken"
      >
        <Printer size={20} aria-hidden className={state.connected ? 'text-success' : undefined} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Stampante" description={state.connected ? `Collegata: ${state.deviceName ?? 'stampante'}` : 'Nessuna stampante collegata. La vendita funziona anche senza.'} size="sm">
          <div className="flex flex-col gap-2">
            {busy && <Loader2 className="mx-auto animate-spin" aria-label="Attendi" />}
            {state.connected ? (
              <>
                <Button size="lg" variant="secondary" onClick={() => run(() => bluetoothPrinter.print(generateTestTicketEscpos(toPrinterSettings(settings))))}>
                  Stampa una prova
                </Button>
                <Button size="lg" variant="danger" onClick={() => run(() => bluetoothPrinter.disconnect())}>
                  Scollega
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" icon={Bluetooth} disabled={!state.isBluetoothSupported || busy} onClick={() => run(() => bluetoothPrinter.connectBluetooth())}>
                  Collega via Bluetooth
                </Button>
                <Button size="lg" variant="secondary" icon={Usb} disabled={!state.isSerialSupported || busy} onClick={() => run(() => bluetoothPrinter.connectSerial())}>
                  Collega via cavo (seriale)
                </Button>
                {!state.isBluetoothSupported && !state.isSerialSupported && <p className="text-label text-muted">Questo browser non può collegare stampanti: usa Chrome su Android o su computer.</p>}
              </>
            )}
            {error && (
              <p role="alert" className="text-body text-danger">
                {error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
