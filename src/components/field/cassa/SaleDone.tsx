'use client';

import { CheckCircle2, CloudOff, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { METHOD_LABEL, type PrinterSettings, type Sale } from '@/lib/cash/types';
import { formatMoney } from '@/lib/money';
import { BigButton } from './Keypad';
import { printSale, usePrinter } from './printing';

type Props = { sale: Sale; printer: PrinterSettings; editionTitle: string; operatorName?: string; onNext: () => void };

/** Vendita fatta: numero grande da dire al cliente, resto, stampa (§12.1 punto 6). */
export function SaleDone({ sale, printer, editionTitle, operatorName, onNext }: Props) {
  const printerState = usePrinter();
  const [printError, setPrintError] = useState('');
  const [printing, setPrinting] = useState(false);
  const autoPrinted = useRef(false);

  async function print() {
    setPrinting(true);
    setPrintError('');
    try {
      await printSale(sale, printer, editionTitle, operatorName);
    } catch (e) {
      setPrintError(e instanceof Error ? e.message : 'Stampa non riuscita.');
    } finally {
      setPrinting(false);
    }
  }

  useEffect(() => {
    if (autoPrinted.current || !printer.autoPrintOnOrder || !printerState.connected) return;
    autoPrinted.current = true;
    print();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola stampa automatica per vendita
  }, [printer.autoPrintOnOrder, printerState.connected]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
      {sale.queued ? <CloudOff size={40} className="text-warning" aria-hidden /> : <CheckCircle2 size={40} className="text-success" aria-hidden />}
      <p className="mt-2 text-body text-muted">{sale.queued ? 'Salvata sul telefono: partirà appena torna la rete' : `${METHOD_LABEL[sale.method]} · ${formatMoney(sale.totalCents)}`}</p>
      <p className="mt-1 text-label text-muted">Numero ordine</p>
      <p className="text-[5rem] leading-none font-black tabular-nums" aria-live="polite">
        {sale.number !== null ? sale.number : '—'}
      </p>
      {sale.queued && <p className="mt-2 text-label text-muted">Il numero arriva quando la vendita raggiunge il server.</p>}
      {sale.changeCents !== null && sale.changeCents > 0 && (
        <p className="mt-4 w-full rounded-xl bg-success-bg px-4 py-3 text-section">
          Resto da dare <strong className="block text-[2rem] tabular-nums">{formatMoney(sale.changeCents)}</strong>
        </p>
      )}
      {(sale.oversold || sale.afterClose) && (
        <p className="mt-3 w-full rounded-xl bg-warning-bg p-3 text-body">
          {sale.oversold ? 'Venduta oltre la scorta disponibile: è segnalata in admin.' : 'Registrata dopo la chiusura del turno: è segnalata in admin.'}
        </p>
      )}
      <ul className="mt-4 w-full text-left text-body">
        {sale.lines.map((l) => (
          <li key={l.productId} className="flex justify-between border-b border-border py-1">
            <span>
              {l.quantity} × {l.name}
            </span>
            <span className="tabular-nums">{formatMoney(l.totalCents)}</span>
          </li>
        ))}
      </ul>
      {printerState.connected && (
        <BigButton tone="secondary" className="mt-4" onClick={print} disabled={printing}>
          <Printer size={20} aria-hidden /> {printing ? 'Stampa…' : 'Stampa'}
        </BigButton>
      )}
      {printError && (
        <p role="alert" className="mt-2 text-body text-danger">
          {printError}
        </p>
      )}
      <BigButton className="mt-3" onClick={onNext}>
        Nuova vendita
      </BigButton>
    </div>
  );
}
