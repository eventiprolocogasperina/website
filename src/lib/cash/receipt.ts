// Ponte verso la stampa ESC/POS di oggi (src/lib/printer): una vendita della nuova cassa diventa un
// CashierOrder, così scontrino del contributo e comande per reparto escono identici, senza toccare
// i generatori già usati da /cashier.
import type { CashierOrder, CashierPrinterSettings } from '@/lib/data/cashier';
import type { PrinterSettings, Sale } from './types';

const METHOD: Record<Sale['method'], CashierOrder['paymentMethod']> = { cash: 'CONTANTI', card_pos: 'POS', complimentary: 'OMAGGIO' };

export function toPrintableOrder(sale: Sale, editionTitle: string, operatorName?: string): CashierOrder {
  return {
    id: sale.orderId,
    eventId: '',
    eventName: editionTitle,
    orderNumber: sale.number ?? 0,
    cassaName: sale.registerName,
    operatorName,
    totalAmount: sale.totalCents / 100,
    paymentMethod: METHOD[sale.method],
    cashReceived: sale.cashReceivedCents !== null ? sale.cashReceivedCents / 100 : undefined,
    cashChange: sale.changeCents !== null ? sale.changeCents / 100 : undefined,
    omaggioNote: sale.complimentaryReason ?? undefined,
    items: sale.lines.map((l) => ({
      id: l.productId,
      name: l.name,
      category: l.department ?? 'Generale',
      department: l.department ?? undefined,
      price: l.unitPriceCents / 100,
      quantity: l.quantity,
      subtotal: l.totalCents / 100,
    })),
    status: 'COMPLETED',
    createdAt: sale.at,
  };
}

/** Le impostazioni della cassa nella forma che si aspetta la stampa di oggi. Niente QR: la nuova cassa non ha una ricevuta online. */
export function toPrinterSettings(p: PrinterSettings): CashierPrinterSettings {
  return { ...p, showQrCode: false };
}
