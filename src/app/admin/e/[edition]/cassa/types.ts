// Dati della pagina Cassa dell'admin, già serializzati per il client.
import type { PrinterSettings } from '@/lib/cash/types';
import type { DeviceRow } from '@/server/domain/devices';

export type AdminRegister = {
  id: string;
  name: string;
  active: boolean;
  issuesNumbers: boolean;
  /** Pulsante "Altro" (importo libero) su questa cassa. */
  allowOpenAmount: boolean;
  productIds: string[] | null;
  printer: PrinterSettings;
  openSince: string | null;
};

/** remaining: pezzi rimasti secondo le quote (null = senza limite). */
export type AdminPosProduct = { id: string; name: string; group: string; priceCents: number; active: boolean; remaining: number | null };

export type AdminSession = {
  id: string;
  registerName: string;
  openedAt: string;
  openedByName: string | null;
  closedAt: string | null;
  openingFloatCents: number;
  differenceCents: number | null;
  zReportNumber: number | null;
  netCents: number | null;
  notes: string | null;
};

export type AdminFlagged = { orderId: string; code: string; number: number | null; register: string; at: string; totalCents: number; oversold: boolean; afterClose: boolean };

/** Dispositivo di cassa dell'edizione, con persona, cassa e permessi. */
export type AdminDevice = DeviceRow;

export type CashAdminData = {
  edition: { slug: string; title: string; status: string; readOnly: boolean; departmentsModule: boolean; readyScreen: boolean };
  can: { edit: boolean; report: boolean; devices: boolean; correct: boolean };
  registers: AdminRegister[];
  products: AdminPosProduct[];
  nextNumber: number;
  departments: Array<{ name: string; products: number }>;
  sessions: AdminSession[] | null;
  summary: {
    netCents: number;
    complimentaryCents: number;
    sales: number;
    voided: number;
    byMethod: Array<{ label: string; netCents: number; count: number }>;
    /** Pezzi venduti per prodotto, senza gli annullati (omaggi compresi). */
    products: Array<{ id: string; name: string; quantity: number; amountCents: number }>;
  } | null;
  flagged: AdminFlagged[] | null;
  devices: AdminDevice[] | null;
};
