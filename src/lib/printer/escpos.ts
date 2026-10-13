import { CashierOrder, CashierPrinterSettings, DEFAULT_PRINTER_SETTINGS } from '@/lib/data/cashier';

// ─── ESC/POS Command Constants ───────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;

export const ESC_COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  TEXT_NORMAL: [GS, 0x21, 0x00],
  TEXT_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
  TEXT_DOUBLE_WIDTH: [GS, 0x21, 0x10],
  TEXT_DOUBLE_SIZE: [GS, 0x21, 0x11], // 2x width & 2x height
  LINE_FEED: [0x0a],
  PAPER_PARTIAL_CUT: [GS, 0x56, 0x42, 0x00], // GS V B 0
  PAPER_FULL_CUT: [GS, 0x56, 0x00],
};

// ─── Text Sanitization & Formatting Helpers ─────────────────────────────────

/**
 * Sanitizes Italian text for thermal receipt printers (ASCII / CP437 safe).
 * Prevents garbled characters on budget thermal printers.
 */
export function sanitizeThermalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[àá]/g, "a'")
    .replace(/[èé]/g, "e'")
    .replace(/[ìí]/g, "i'")
    .replace(/[òó]/g, "o'")
    .replace(/[ùú]/g, "u'")
    .replace(/[ÀÁ]/g, "A'")
    .replace(/[ÈÉ]/g, "E'")
    .replace(/[ÌÍ]/g, "I'")
    .replace(/[ÒÓ]/g, "O'")
    .replace(/[ÙÚ]/g, "U'")
    .replace(/€/g, 'EUR ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    // Remove non-printable / high unicode characters that break thermal printers
    .replace(/[^\x20-\x7E\n\r]/g, '');
}

/**
 * Creates a two-column row with left and right text padded with spaces to match line width.
 * e.g. "2x Fileja Silana         EUR 14.00"
 */
export function formatTwoColumns(left: string, right: string, width: number): string {
  const cleanLeft = sanitizeThermalText(left);
  const cleanRight = sanitizeThermalText(right);
  const totalLength = cleanLeft.length + cleanRight.length;

  if (totalLength >= width) {
    const maxLeftLength = Math.max(1, width - cleanRight.length - 1);
    const truncatedLeft = cleanLeft.substring(0, maxLeftLength);
    return `${truncatedLeft} ${cleanRight}`;
  }

  const spacesNeeded = width - totalLength;
  return `${cleanLeft}${' '.repeat(spacesNeeded)}${cleanRight}`;
}

/**
 * Centers text within the specified line width.
 */
export function centerText(text: string, width: number): string {
  const clean = sanitizeThermalText(text);
  if (clean.length >= width) return clean;
  const leftSpaces = Math.floor((width - clean.length) / 2);
  const rightSpaces = width - clean.length - leftSpaces;
  return `${' '.repeat(leftSpaces)}${clean}${' '.repeat(rightSpaces)}`;
}

/**
 * Builds a horizontal divider line of specified width.
 */
export function divider(char: string = '-', width: number = 32): string {
  return char.repeat(Math.max(10, width));
}

// ─── ESC/POS Byte Buffer Builder ─────────────────────────────────────────────

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.add(ESC_COMMANDS.INIT);
  }

  add(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  align(alignment: 'left' | 'center' | 'right'): this {
    if (alignment === 'center') this.add(ESC_COMMANDS.ALIGN_CENTER);
    else if (alignment === 'right') this.add(ESC_COMMANDS.ALIGN_RIGHT);
    else this.add(ESC_COMMANDS.ALIGN_LEFT);
    return this;
  }

  bold(enable: boolean = true): this {
    this.add(enable ? ESC_COMMANDS.BOLD_ON : ESC_COMMANDS.BOLD_OFF);
    return this;
  }

  size(mode: 'normal' | 'double-height' | 'double-width' | 'double-size'): this {
    if (mode === 'double-size') this.add(ESC_COMMANDS.TEXT_DOUBLE_SIZE);
    else if (mode === 'double-height') this.add(ESC_COMMANDS.TEXT_DOUBLE_HEIGHT);
    else if (mode === 'double-width') this.add(ESC_COMMANDS.TEXT_DOUBLE_WIDTH);
    else this.add(ESC_COMMANDS.TEXT_NORMAL);
    return this;
  }

  line(text: string = ''): this {
    const clean = sanitizeThermalText(text);
    for (let i = 0; i < clean.length; i++) {
      this.buffer.push(clean.charCodeAt(i));
    }
    this.buffer.push(0x0a);
    return this;
  }

  feed(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  cut(partial: boolean = true): this {
    this.feed(3);
    this.add(partial ? ESC_COMMANDS.PAPER_PARTIAL_CUT : ESC_COMMANDS.PAPER_FULL_CUT);
    return this;
  }

  /**
   * Generates native ESC/POS QR Code command (Model 2).
   */
  qrCode(data: string, size: number = 5): this {
    if (!data) return this;
    const clean = data.trim();
    const length = clean.length + 3;
    const pL = length % 256;
    const pH = Math.floor(length / 256);

    // 1. QR Model (Model 2)
    this.add([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    // 2. Module Size (1 to 16, default ~5-6)
    this.add([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, size))]);
    // 3. Error Correction Level (Level M = 49)
    this.add([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
    // 4. Store Data
    const storeHeader = [GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30];
    const dataBytes = Array.from(clean).map(c => c.charCodeAt(0));
    this.add([...storeHeader, ...dataBytes]);
    // 5. Print QR Code
    this.add([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    this.feed(1);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// ─── Ticket Generation Functions ─────────────────────────────────────────────

/**
 * Generates ESC/POS byte sequence for the full customer receipt.
 */
export function generateCustomerReceiptEscpos(
  order: CashierOrder,
  settings: CashierPrinterSettings = DEFAULT_PRINTER_SETTINGS,
  receiptUrl?: string
): Uint8Array {
  const width = settings.charactersPerLine || (settings.ticketWidthMm >= 80 ? 48 : 32);
  const b = new EscPosBuilder();

  // 1. Header
  b.align('center');
  if (settings.headerTitle) {
    b.bold(true).line(settings.headerTitle).bold(false);
  }
  b.line(order.eventName);
  b.line(divider('-', width));

  // 2. Big Order Number (Double size)
  b.bold(true);
  b.size('normal').line('TICKET ORDINE');
  b.size('double-size').line(`#${String(order.orderNumber).padStart(3, '0')}`);
  b.size('normal').bold(false);

  // 3. Meta (Cassa, Operator, Date)
  const dateStr = new Date(order.createdAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  b.line(`${order.cassaName}${order.operatorName ? ` · ${order.operatorName}` : ''}`);
  b.line(dateStr);
  b.line(divider('=', width));

  // 4. Items Table
  b.align('left');
  order.items.forEach(item => {
    const qtyName = `${item.quantity}x ${item.name}`;
    const priceStr = `EUR ${(item.price * item.quantity).toFixed(2)}`;
    b.line(formatTwoColumns(qtyName, priceStr, width));
  });

  b.line(divider('-', width));

  // 5. Total & Payment
  b.bold(true);
  const totalStr = `EUR ${Number(order.totalAmount).toFixed(2)}`;
  b.size('double-height').line(formatTwoColumns('TOTALE:', totalStr, width)).size('normal');
  b.bold(false);

  const paymentStr = `Pagamento: ${order.paymentMethod}`;
  b.line(paymentStr);

  if (order.paymentMethod === 'CONTANTI' && order.cashChange !== undefined && order.cashChange > 0) {
    b.line(formatTwoColumns('Ricevuto:', `EUR ${Number(order.cashReceived || 0).toFixed(2)}`, width));
    b.line(formatTwoColumns('Resto:', `EUR ${Number(order.cashChange).toFixed(2)}`, width));
  }

  if (order.omaggioNote) {
    b.line(`Note: ${order.omaggioNote}`);
  }

  // 6. QR Code / Receipt Link
  if (settings.showQrCode && receiptUrl) {
    b.feed(1);
    b.align('center');
    try {
      b.qrCode(receiptUrl, settings.ticketWidthMm >= 80 ? 6 : 4);
    } catch {
      // Ignore if printer doesn't support ESC/POS QR
    }
    b.size('normal').line('Ricevuta digitale:');
    b.line(receiptUrl.replace(/^https?:\/\//, ''));
  }

  // 7. Footer
  if (settings.footerText) {
    b.feed(1);
    b.align('center');
    b.line(settings.footerText);
  }

  // 8. Cut
  if (settings.autoCutPaper) {
    b.cut(true);
  } else {
    b.feed(4);
  }

  return b.build();
}

/**
 * Generates ESC/POS byte sequence for department slips (talloncini cucina/bar).
 */
export function generateDepartmentSlipsEscpos(
  order: CashierOrder,
  settings: CashierPrinterSettings = DEFAULT_PRINTER_SETTINGS
): Uint8Array {
  const width = settings.charactersPerLine || (settings.ticketWidthMm >= 80 ? 48 : 32);
  const b = new EscPosBuilder();

  // Group items by department
  const deptsMap: Record<string, typeof order.items> = {};
  order.items.forEach(it => {
    const dept = it.department || it.category || 'Generale';
    if (!deptsMap[dept]) deptsMap[dept] = [];
    deptsMap[dept].push(it);
  });

  const orderNumStr = `#${String(order.orderNumber).padStart(3, '0')}`;
  const timeStr = new Date(order.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  const entries = Object.entries(deptsMap);
  entries.forEach(([dept, items], index) => {
    b.align('center');
    b.bold(true).line(`*** STAND: ${dept.toUpperCase()} ***`).bold(false);
    b.line(divider('-', width));

    b.bold(true);
    b.size('double-size').line(orderNumStr);
    b.size('normal').bold(false);

    b.line(`${order.eventName} · ${order.cassaName} · ore ${timeStr}`);
    if (order.omaggioNote) {
      b.bold(true).line(`NOTE: ${order.omaggioNote}`).bold(false);
    }
    b.line(divider('=', width));

    // Items list (emphasized quantity)
    b.align('left');
    items.forEach(it => {
      b.bold(true).size('double-height');
      b.line(`${it.quantity}x ${it.name}`);
      b.size('normal').bold(false);
    });

    b.line(divider('-', width));
    b.align('center');
    b.line('PRO LOCO GASPERINA · COMANDA REPARTO');

    if (settings.autoCutPaper) {
      b.cut(true);
    } else {
      b.feed(3);
      if (index < entries.length - 1) {
        b.line(divider('*', width));
        b.feed(1);
      }
    }
  });

  return b.build();
}

/**
 * Combines customer receipt and department slips based on settings.
 */
export function generateAllTicketsEscpos(
  order: CashierOrder,
  settings: CashierPrinterSettings = DEFAULT_PRINTER_SETTINGS,
  receiptUrl?: string
): Uint8Array {
  const chunks: Uint8Array[] = [];

  if (settings.printCustomerReceipt) {
    chunks.push(generateCustomerReceiptEscpos(order, settings, receiptUrl));
  }

  if (settings.printDepartmentSlips) {
    chunks.push(generateDepartmentSlipsEscpos(order, settings));
  }

  if (chunks.length === 0) {
    // Default fallback to customer receipt if both disabled
    chunks.push(generateCustomerReceiptEscpos(order, settings, receiptUrl));
  }

  // Combine into single Uint8Array
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Generates a test ticket to verify printer connection and paper width calibration.
 */
export function generateTestTicketEscpos(
  settings: CashierPrinterSettings = DEFAULT_PRINTER_SETTINGS
): Uint8Array {
  const width = settings.charactersPerLine || (settings.ticketWidthMm >= 80 ? 48 : 32);
  const b = new EscPosBuilder();

  b.align('center');
  b.bold(true).line('TEST STAMPANTE BLUETOOTH').bold(false);
  b.line(settings.headerTitle || 'PRO LOCO GASPERINA APS');
  b.line(divider('=', width));

  b.align('left');
  b.line(`Larghezza carta: ${settings.ticketWidthMm} mm`);
  b.line(`Caratteri/riga:  ${width}`);
  b.line(`Data e Ora:      ${new Date().toLocaleTimeString('it-IT')}`);
  b.line(divider('-', width));

  // Width Ruler / Calibration
  b.align('center');
  b.line('CALIBRAZIONE LARGHEZZA:');
  const ruler = width >= 40
    ? '1...5...10...15...20...25...30...35...40'
    : '1...5...10...15...20...25...30..';
  b.line(ruler.substring(0, width));
  b.line(divider('-', width));

  b.align('left');
  b.line(formatTwoColumns('1x Prova Allineamento', 'EUR 5.00', width));
  b.line(formatTwoColumns('2x Test Colonna DX', 'EUR 10.00', width));
  b.bold(true);
  b.line(formatTwoColumns('TOTALE TEST:', 'EUR 15.00', width));
  b.bold(false);
  b.line(divider('=', width));

  b.align('center');
  b.bold(true).line('STAMPA DIRETTA ATTIVA!').bold(false);
  b.line('Se questa riga e centrata e leggibile, la larghezza e corretta.');

  if (settings.autoCutPaper) {
    b.cut(true);
  } else {
    b.feed(4);
  }

  return b.build();
}
