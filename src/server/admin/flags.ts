import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { cache } from 'react';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { siteSettings } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';

// Interruttori per il passaggio graduale alle pagine nuove (§16), in site_settings come legacy_event_code.

const ORDERS_V2 = 'orders_v2';

/**
 * Flag `orders_v2`: acceso, le vecchie rotte di ordini, rimborsi e prenotazioni portano alle pagine
 * nuove. Spento (default, migrazione 0010) restano le pagine di oggi. Le pagine nuove esistono
 * comunque, raggiungibili dalla sidebar dell'edizione. Se il database non risponde: spento.
 */
export const ordersV2Enabled = cache(async (): Promise<boolean> => {
  try {
    const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, ORDERS_V2));
    return row?.value === 'true';
  } catch {
    return false;
  }
});

/** Accende o spegne il flag. Solo chi gestisce le impostazioni; resta nel registro. */
export async function setOrdersV2Enabled(ctx: Ctx, enabled: boolean): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  await withTransaction(async (tx) => {
    await tx
      .insert(siteSettings)
      .values({ key: ORDERS_V2, value: String(enabled) })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: String(enabled), updatedAt: sql`CURRENT_TIMESTAMP` } });
    await audit(tx, ctx, 'settings.flag_changed', { entityType: 'setting', entityId: ORDERS_V2, after: { [ORDERS_V2]: enabled } });
  });
}
