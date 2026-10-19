// Unico punto in cui i moduli vengono registrati (§7).
import { attendeeQuestions } from './attendee-questions/module';
import { broadcast } from './broadcast/module';
import { departments } from './departments/module';
import { freeBooking } from './free-booking/module';
import { invites } from './invites/module';
import { landingPage } from './landing-page/module';
import { paylink } from './paylink/module';
import { postponement } from './postponement/module';
import { reviews } from './reviews/module';
import { routeStops } from './route-stops/module';
import { timeSlots } from './time-slots/module';
import type { EditionModule, ModuleKey } from './types';
import { visitorPhotos } from './visitor-photos/module';

export const MODULES: EditionModule[] = [
  timeSlots,
  attendeeQuestions,
  postponement,
  invites,
  visitorPhotos,
  routeStops,
  departments,
  reviews,
  freeBooking,
  landingPage,
  paylink,
  broadcast,
] as EditionModule[];

export const MODULE_KEYS = MODULES.map((m) => m.key);

export function getModule(key: string): EditionModule | null {
  return MODULES.find((m) => m.key === key) ?? null;
}

export function isModuleKey(key: string): key is ModuleKey {
  return MODULE_KEYS.includes(key as ModuleKey);
}

/** Impostazioni del modulo, validate e con i valori di default. Valori non validi tornano al default. */
export function moduleSettings(key: ModuleKey, raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const m = getModule(key)!;
  const parsed = m.settingsSchema.safeParse(raw?.[key] ?? {});
  return (parsed.success ? parsed.data : m.settingsSchema.parse({})) as Record<string, unknown>;
}

/** Moduli attivi, nell'ordine del registro. Chiavi sconosciute (moduli rimossi) si ignorano. */
export function enabledModules(enabled: readonly string[]): EditionModule[] {
  return MODULES.filter((m) => enabled.includes(m.key));
}

/** Problemi di dipendenza: moduli attivi che richiedono un modulo spento. */
export function dependencyProblems(enabled: readonly string[]): Array<{ module: ModuleKey; missing: ModuleKey }> {
  return enabledModules(enabled).flatMap((m) => (m.dependsOn ?? []).filter((d) => !enabled.includes(d)).map((missing) => ({ module: m.key, missing })));
}

/** Moduli attivi che dipendono da `key`: non si può spegnere `key` finché sono accesi. */
export function dependents(key: ModuleKey, enabled: readonly string[]): EditionModule[] {
  return enabledModules(enabled).filter((m) => m.dependsOn?.includes(key));
}

// ─── Punti di estensione (§7): raccolgono i contributi dei moduli attivi ─────────

type EditionLike = { enabledModules: readonly string[]; moduleSettings: Record<string, unknown> | null };

export const extensionPoints = {
  orderPanels: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => m.admin?.orderPanels ?? []),
  orderActions: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => m.admin?.orderActions ?? []),
  dashboardWidgets: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => m.admin?.dashboardWidgets ?? []),
  closingChecks: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => (m.admin?.closingChecks ?? []).map((c) => ({ ...c, module: m.key }))),
  checkoutSteps: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => m.checkout?.steps ?? []),
  posActions: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => m.pos?.actions ?? []),
  scannerActions: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => m.scanner?.actions?.({ settings: moduleSettings(m.key, e.moduleSettings) as never }) ?? []),
  nav: (e: EditionLike) => enabledModules(e.enabledModules).flatMap((m) => (m.admin?.nav ? [{ key: m.key, ...m.admin.nav }] : [])),
};
