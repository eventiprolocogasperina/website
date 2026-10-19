// Backfill delle casse (prompt 14): dalla configurazione della vecchia cassa (evt.casses,
// cassaAssignments, printerSettings) alle righe di cash_registers. Funzione pura, come planBackfill.
import type { CashierEvent, CashierPrinterSettings } from '@/lib/data/cashier';
import type { RegisterPrinterSettings } from '@/server/db/schema/cash';
import type { LegacyRef } from './backfill';

export type PlannedRegister = {
  edition: string;
  name: string;
  /** null = tutti i prodotti con il canale cassa. Altrimenti i prodotti della vecchia cassa. */
  products: LegacyRef[] | null;
  printer: RegisterPrinterSettings | null;
  issuesNumbers: boolean;
  sort: number;
  legacy: LegacyRef;
};

const toPrinter = (p: CashierPrinterSettings | undefined): RegisterPrinterSettings | null =>
  p
    ? {
        ticketWidthMm: p.ticketWidthMm,
        charactersPerLine: p.charactersPerLine,
        autoPrintOnOrder: p.autoPrintOnOrder,
        printCustomerReceipt: p.printCustomerReceipt,
        printDepartmentSlips: p.printDepartmentSlips,
        headerTitle: p.headerTitle,
        footerText: p.footerText,
        // La nuova cassa non stampa il QR della ricevuta online.
        showQrCode: false,
        autoCutPaper: p.autoCutPaper,
      }
    : null;

/**
 * Le casse di un evento della vecchia cassa. Senza elenco si crea una sola "Cassa". Una cassa senza
 * assegnazioni (o con assegnazioni vuote) vende tutto, come oggi. Le assegnazioni a prodotti che non
 * esistono più si ignorano; i numeri progressivi restano uno solo per edizione, come oggi.
 */
export function planRegisters(edition: string, evt: CashierEvent, importedItemIds: Set<string>, fallbackPrinter?: CashierPrinterSettings): { registers: PlannedRegister[]; notes: string[] } {
  const names = [...new Set((evt.casses ?? []).map((c) => c.trim()).filter(Boolean))];
  const list = names.length ? names : ['Cassa'];
  const printer = toPrinter(evt.printerSettings ?? fallbackPrinter);
  const notes: string[] = [];
  const registers = list.map((name, i) => {
    const assigned = (evt.cassaAssignments?.[name] ?? []).filter((id) => importedItemIds.has(id));
    const dropped = (evt.cassaAssignments?.[name] ?? []).length - assigned.length;
    if (dropped > 0) notes.push(`Cassa "${name}" di ${evt.name}: ${dropped} prodotti assegnati non esistono più e sono stati ignorati.`);
    return {
      edition,
      name: name.slice(0, 40),
      products: assigned.length ? assigned.map((id) => ({ kind: 'cashier_item', id: `${evt.id}:${id}` })) : null,
      printer,
      issuesNumbers: true,
      sort: i + 1,
      legacy: { kind: 'cashier_register', id: `${evt.id}:${name}` },
    };
  });
  return { registers, notes };
}
