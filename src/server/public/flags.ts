import 'server-only';
import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { getDb } from '@/server/db/client';
import { siteSettings } from '@/server/db/schema';

/**
 * Il checkout nuovo sostituisce i componenti d'acquisto di oggi (Zuccaland, A&P) e i vecchi URL di
 * successo portano alla conferma nuova solo con NUOVO_CHECKOUT=1. Spento di default: §18.10, niente
 * cambi all'acquisto di Zuccaland mentre vende.
 */
export const newCheckoutEnabled = () => process.env.NUOVO_CHECKOUT === '1';

export const PUBLIC_V2 = 'public_v2';

/**
 * Flag `site_settings.public_v2` (prompt 17): acceso, menu con la tendina Eventi, calendario dalle edizioni
 * e schede /eventi/[slug] nuove. Spento (default, migrazione 0013) o database irraggiungibile: il sito di oggi.
 */
export const publicV2Enabled = cache(async (): Promise<boolean> => {
  try {
    const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, PUBLIC_V2));
    return row?.value === 'true';
  } catch {
    return false;
  }
});
