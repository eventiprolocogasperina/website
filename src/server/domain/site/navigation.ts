import 'server-only';
import { eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { siteSettings } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { NavConfig, parseNavConfig, resolveNav, type NavConfigInput, type ResolvedNav } from '@/lib/public/nav';
import { listPublicFormats } from '@/server/public/editions';
import { PUBLIC_V2, publicV2Enabled } from '@/server/public/flags';

// Menu del sito (§13.1) e interruttore public_v2. Il menu sta in site_settings.public_nav (JSON validato).

export const NAV_KEY = 'public_nav';

async function readSetting(key: string): Promise<string | null> {
  const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, key));
  return row?.value ?? null;
}

/** Configurazione salvata (o quella predefinita). */
export async function getNavConfig(): Promise<NavConfig> {
  return parseNavConfig(await readSetting(NAV_KEY));
}

/**
 * Menu pronto per la Navbar, con i format espansi. null = flag spento (la Navbar resta quella di oggi).
 * Se il database non risponde: null, mai una pagina rotta per colpa del menu.
 */
export async function loadPublicNav(): Promise<ResolvedNav | null> {
  try {
    if (!(await publicV2Enabled())) return null;
    const [config, formats] = await Promise.all([getNavConfig(), listPublicFormats()]);
    return resolveNav(config, formats);
  } catch {
    return null;
  }
}

export const NAV_CACHE_TAG = 'public-nav';

/**
 * Il menu lo legge il layout di ogni pagina: in cache per 5 minuti (così una nuova edizione pubblicata
 * compare nella tendina senza toccare il codice), e subito dopo un salvataggio da admin (revalidateTag).
 */
export const getPublicNav = unstable_cache(loadPublicNav, ['public-nav'], { tags: [NAV_CACHE_TAG], revalidate: 300 });

async function writeSetting(ctx: Ctx, key: string, value: string, entity: string, before: unknown, after: unknown, action: string) {
  await withTransaction(async (tx) => {
    const [old] = await tx.select().from(siteSettings).where(eq(siteSettings.key, key)).for('update');
    if (old) await tx.update(siteSettings).set({ value, updatedAt: new Date().toISOString() }).where(eq(siteSettings.key, key));
    else await tx.insert(siteSettings).values({ key, value });
    await audit(tx, ctx, action, { entityType: 'site_setting', entityId: entity, before, after });
  });
}

/** Salva il menu. Serve `content.edit`; resta nel registro con il prima e il dopo. */
export async function saveNavigation(ctx: Ctx, input: NavConfigInput): Promise<void> {
  if (!can(ctx, 'content.edit')) throw new DomainError('FORBIDDEN');
  const data = NavConfig.parse(input);
  const before = await getNavConfig();
  await writeSetting(ctx, NAV_KEY, JSON.stringify(data), NAV_KEY, before, data, 'site.navigation_saved');
}

/** Accende o spegne menu e calendario nuovi sul sito pubblico (titolare e amministratori). */
export async function setPublicV2(ctx: Ctx, enabled: boolean): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const before = (await readSetting(PUBLIC_V2)) === 'true';
  await writeSetting(ctx, PUBLIC_V2, String(enabled), PUBLIC_V2, { value: before }, { value: enabled }, 'settings.flag_changed');
}
