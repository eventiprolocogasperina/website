// Tipi del contesto di chi agisce (§6), senza dipendenze dal server: usati anche nei test.
import { effectiveDevicePermissions } from '@/lib/devices/permissions';
import type { Permission, PermissionGrant, RoleGrant } from './permissions';

export type CtxUser = { id: string; name: string; email: string | null };
export type CtxDevice = {
  id: string;
  name: string;
  edition: string;
  kind: 'pos' | 'scanner';
  /** Cassa assegnata al dispositivo (solo cassa): niente scelta della cassa sul telefono. */
  registerId?: string | null;
  /** Permessi scelti all'abbinamento; null = quelli del ruolo (cassiere o varco). */
  permissions?: Permission[] | null;
};

/**
 * Chi sta agendo. Non esiste un servizio che lavori senza Ctx.
 * - utente dell'admin: user, grants dai suoi ruoli;
 * - accesso di emergenza (ALLOW_LEGACY_ADMIN): user null, legacy true, grants owner;
 * - volontario con PIN: user e device; i grants valgono solo sull'edizione del dispositivo.
 */
export type Ctx = {
  user: CtxUser | null;
  device: CtxDevice | null;
  legacy: boolean;
  grants: RoleGrant[];
  /** Permessi singoli su un'edizione: un dispositivo da campo con i permessi scelti all'abbinamento. */
  permissions?: PermissionGrant[];
  ip: string | null;
  /** Processi automatici (cron, callback di pagamento già verificati): il nome compare nel registro. */
  system?: string;
};

/**
 * Contesto del dispositivo da solo: i permessi scelti all'abbinamento (o modificati dopo) come
 * permessi singoli sulla sua edizione; i dispositivi abbinati prima dei permessi (NULL) valgono
 * ancora come il ruolo cassiere o varco.
 */
export function deviceCtx(device: CtxDevice, ip: string | null): Ctx {
  if (!device.permissions) return { user: null, device, legacy: false, grants: [{ role: device.kind === 'pos' ? 'cashier' : 'gate', edition: device.edition }], ip };
  const permissions = effectiveDevicePermissions(device.kind, device.permissions).map((permission) => ({ permission, edition: device.edition }));
  return { user: null, device, legacy: false, grants: [], permissions, ip };
}

/** Contesto di chi compra dal sito: nessun ruolo, solo l'IP. */
export function publicCtx(ip: string | null = null): Ctx {
  return { user: null, device: null, legacy: false, grants: [], ip };
}

/** Contesto di un processo automatico, già autenticato dal chiamante (segreto del cron, firma del gestore). */
export function systemCtx(name: string): Ctx {
  return { user: null, device: null, legacy: false, grants: [], ip: null, system: name };
}

export function actorLabel(ctx: Ctx): string {
  if (ctx.system) return `Sistema · ${ctx.system}`;
  if (ctx.legacy) return 'Accesso di emergenza';
  const who = ctx.user?.name ?? 'Non identificato';
  return ctx.device ? `${who} · ${ctx.device.name}` : who;
}
