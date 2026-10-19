// Contratto dei moduli (ARCHITETTURA §7). Le definizioni sono dati: si leggono sia dal server sia
// dall'interfaccia. Il codice che scrive (handler degli eventi, servizi) sta in `server.ts` di ogni modulo.
import type { z } from 'zod';
import type { Permission } from '@/server/auth/permissions';

export type ModuleKey =
  | 'time-slots'
  | 'activities'
  | 'postponement'
  | 'invites'
  | 'visitor-photos'
  | 'route-stops'
  | 'departments'
  | 'reviews'
  | 'free-booking'
  | 'landing-page'
  | 'paylink'
  | 'broadcast';

/** Voce sotto "Moduli" nella scheda edizione: la pagina è /admin/e/<edizione>/m/<key>. */
export type AdminNavItem = { label: string; icon: 'send' | 'camera' | 'star' | 'link' | 'megaphone' | 'map' | 'chef' | 'palette' | 'cloud'; permission: Permission; badge?: 'photos' };
/** Riquadro nella pagina di dettaglio ordine (prompt 12 lo disegna). */
export type OrderPanel = { key: string; title: string; permission: Permission };
/** Azione nel menu "Altre azioni" dell'ordine. */
export type OrderAction = { key: string; label: string; permission: Permission; destructive?: boolean };
export type DashboardWidget = { key: string; title: string };
/**
 * Controllo della checklist di chiusura (§9). Per archiviare ogni controllo deve essere a posto o
 * saltato con un motivo; `blocking` = non si può saltare. Il calcolo sta in editions/closing.ts.
 */
export type ClosingCheck = { key: string; label: string; blocking: boolean };
export type CheckoutStep = { key: string; title: string };
export type PosAction = { key: string; label: string };
/** Pulsante dello scanner dopo una lettura valida, es. "+1 Bambino". */
export type ScannerAction = { key: string; label: string; questionKey: string; increment: number };

/** Contesto passato agli hook dichiarativi: le impostazioni già validate del modulo. */
export type ModuleContext<S> = { settings: S };

export interface EditionModule<S extends z.ZodType = z.ZodType> {
  key: ModuleKey;
  name: string;
  description: string;
  /** Impostazioni in editions.module_settings[key]; con default per ogni campo. */
  settingsSchema: S;
  dependsOn?: ModuleKey[];
  /** Testi per i campi delle impostazioni (il form si genera dallo schema). */
  settingsLabels?: Record<string, { label: string; help?: string }>;
  admin?: {
    nav?: AdminNavItem;
    orderPanels?: OrderPanel[];
    orderActions?: OrderAction[];
    dashboardWidgets?: DashboardWidget[];
    closingChecks?: ClosingCheck[];
  };
  checkout?: { steps?: CheckoutStep[] };
  pos?: { actions?: PosAction[] };
  /** Azioni dello scanner, anche calcolate dalle impostazioni. */
  scanner?: { actions?: (ctx: ModuleContext<z.output<S>>) => ScannerAction[] };
  /** Moduli con tabelle proprie (prefisso mod_<key>_ o tabelle di oggi che diventeranno tali). */
  tables?: string[];
}

export function defineModule<S extends z.ZodType>(m: EditionModule<S>): EditionModule<S> {
  return m;
}
