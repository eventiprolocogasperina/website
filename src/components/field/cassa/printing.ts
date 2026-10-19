'use client';

import { useEffect, useState } from 'react';
import { toPrintableOrder, toPrinterSettings } from '@/lib/cash/receipt';
import type { PrinterSettings, Sale } from '@/lib/cash/types';
import { bluetoothPrinter, type PrinterState } from '@/lib/printer/bluetoothPrinter';
import { generateAllTicketsEscpos } from '@/lib/printer/escpos';

/** Stato della stampante termica (Bluetooth o seriale), la stessa della vecchia cassa. */
export function usePrinter(): PrinterState {
  const [state, setState] = useState<PrinterState>(() => bluetoothPrinter.getState());
  useEffect(() => bluetoothPrinter.subscribe(setState), []);
  return state;
}

/**
 * Stampa ricevuta del contributo e comande per reparto con i generatori ESC/POS di oggi.
 * Una vendita ancora in coda non ha numero: si stampa con #000 e la scritta "in attesa di rete" nel piede.
 */
export async function printSale(sale: Sale, settings: PrinterSettings, editionTitle: string, operatorName?: string): Promise<void> {
  const order = toPrintableOrder(sale, editionTitle, operatorName);
  const printer = toPrinterSettings(settings);
  if (sale.queued) printer.footerText = `${printer.footerText ? `${printer.footerText} · ` : ''}Numero in attesa di rete`;
  await bluetoothPrinter.print(generateAllTicketsEscpos(order, printer));
}
