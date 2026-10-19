// Tipi del contesto di chi agisce (§6), senza dipendenze dal server: usati anche nei test.
import type { RoleGrant } from './permissions';

export type CtxUser = { id: string; name: string; email: string | null };
export type CtxDevice = { id: string; name: string; edition: string; kind: 'pos' | 'scanner' };

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
  ip: string | null;
};

export function actorLabel(ctx: Ctx): string {
  if (ctx.legacy) return 'Accesso di emergenza';
  const who = ctx.user?.name ?? 'Non identificato';
  return ctx.device ? `${who} · ${ctx.device.name}` : who;
}
