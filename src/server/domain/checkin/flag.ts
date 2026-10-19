import 'server-only';
import { eq } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { siteSettings } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';

export const SCANNER_FLAG = 'scanner_v2';

/**
 * /scanner apre lo scanner nuovo solo con il flag acceso (site_settings.scanner_v2 = "true").
 * Spento, o se il database non risponde, resta lo scanner di oggi: Zuccaland 2026 è in vendita
 * e i suoi ordini arrivano nel nucleo nuovo solo con la migrazione del prompt 10.
 */
export async function scannerV2Enabled(): Promise<boolean> {
  try {
    const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, SCANNER_FLAG));
    return row?.value === 'true';
  } catch {
    return false;
  }
}

/** Accende o spegne lo scanner nuovo su /scanner per tutti i dispositivi (titolare e amministratori). */
export async function setScannerV2(ctx: Ctx, enabled: boolean): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  await withTransaction(async (tx) => {
    const [before] = await tx.select().from(siteSettings).where(eq(siteSettings.key, SCANNER_FLAG)).for('update');
    const value = enabled ? 'true' : 'false';
    if (before) await tx.update(siteSettings).set({ value, updatedAt: new Date().toISOString() }).where(eq(siteSettings.key, SCANNER_FLAG));
    else await tx.insert(siteSettings).values({ key: SCANNER_FLAG, value });
    await audit(tx, ctx, 'settings.flag_changed', { entityType: 'site_setting', entityId: SCANNER_FLAG, before: { value: before?.value ?? null }, after: { value } });
  });
}
