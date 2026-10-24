// Sito pubblico (prompt 17) su un Postgres vero: menu, interruttore public_v2, edizioni pubbliche,
// pagina Trasparenza e richieste degli interessati.
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { auditLog, editions, privacyRequests, series, siteSettings } from '@/server/db/schema';
import { DEFAULT_NAV } from '@/lib/public/nav';
import { DEFAULT_TRANSPARENCY } from '@/lib/public/transparency';
import { createEdition, owner, roleOn } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { findPublicEdition, listPublicEditions, listPublicFormats } from '@/server/public/editions';
import { getNavConfig, loadPublicNav, saveNavigation, setPublicV2 } from './navigation';
import { createPrivacyRequest, getTransparency, listPrivacyRequests, publishTransparency, updatePrivacyRequest } from './transparency';

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/server/integrations/telegram', () => ({ sendAlert: vi.fn(async () => {}) }));

const enabled = !!process.env.TEST_DATABASE_URL;
afterAll(() => (enabled ? closeTestDb() : undefined));

describe.skipIf(!enabled)('menu e flag', () => {
  it('flag spento: nessun menu configurabile; acceso: tendina con i format', async () => {
    const db = getDb();
    const [s] = await db.insert(series).values({ slug: `f-${Date.now()}`, name: 'Festa Test', landingPath: '/festa-test' }).returning();
    const f = await createEdition({ status: 'published' });
    await db.update(editions).set({ seriesId: s.id, publicPageMode: 'landing' }).where(eq(editions.id, f.edition.id));

    await setPublicV2(owner, false);
    expect(await loadPublicNav()).toBeNull();
    await setPublicV2(owner, true);
    const nav = await loadPublicNav();
    expect(nav?.items.find((i) => i.label === 'Eventi')?.children).toContainEqual({ label: 'Festa Test', href: '/festa-test' });
    expect((await listPublicFormats()).some((x) => x.href === '/festa-test')).toBe(true);
    await setPublicV2(owner, false);
  });

  it('salva il menu con content.edit, rifiuta gli altri e resta nel registro', async () => {
    await expect(saveNavigation(roleOn('cashier', null), DEFAULT_NAV)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(setPublicV2(roleOn('editor', null), true)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const items = [{ label: 'Home', href: '/', children: [] }];
    await saveNavigation(roleOn('editor', null), { ...DEFAULT_NAV, items });
    expect((await getNavConfig()).items).toEqual(items);
    const logs = await getDb().select().from(auditLog).where(eq(auditLog.action, 'site.navigation_saved'));
    expect(logs.length).toBeGreaterThan(0);
    await expect(saveNavigation(owner, { ...DEFAULT_NAV, items: [] })).rejects.toBeTruthy();
    await getDb().delete(siteSettings).where(eq(siteSettings.key, 'public_nav'));
  });
});

describe.skipIf(!enabled)('edizioni pubbliche', () => {
  it('nasconde le bozze e trova un\'edizione per slug', async () => {
    const draft = await createEdition({ status: 'draft' });
    const live = await createEdition({ status: 'on_sale' });
    const list = await listPublicEditions();
    expect(list.some((e) => e.slug === draft.slug)).toBe(false);
    expect(list.some((e) => e.slug === live.slug)).toBe(true);
    expect(await findPublicEdition(live.slug)).toMatchObject({ href: `/eventi/${live.slug}`, byLegacySlug: false });
    expect(await findPublicEdition(draft.slug)).toBeNull();
    expect(await findPublicEdition('../x')).toBeNull();
  });
});

describe.skipIf(!enabled)('trasparenza', () => {
  it('senza versioni vale il testo di partenza; pubblicare aggiunge una versione', async () => {
    const before = await getTransparency();
    expect(before.content.processors.length).toBeGreaterThan(0);
    await expect(publishTransparency(roleOn('cashier', null), { content: DEFAULT_TRANSPARENCY, note: 'Prova' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await publishTransparency(owner, { content: { ...DEFAULT_TRANSPARENCY, contactEmail: 'privacy@prova.local' }, note: 'Nuova email' });
    const after = await getTransparency();
    expect(after.content.contactEmail).toBe('privacy@prova.local');
    expect(after.versions[0].note).toBe('Nuova email');
  });

  it('una richiesta dal modulo crea una voce in admin, visibile solo con customers.read', async () => {
    const { id } = await createPrivacyRequest('203.0.113.9', { kind: 'erasure', name: 'Mario Rossi', email: 'Mario@Prova.local', consent: true });
    await expect(createPrivacyRequest(null, { kind: 'access', name: 'Bot', email: 'b@x.it', consent: true, website: 'spam' })).rejects.toBeTruthy();
    await expect(listPrivacyRequests(roleOn('editor', null))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const { rows, open } = await listPrivacyRequests(owner);
    expect(open).toBeGreaterThan(0);
    expect(rows.find((r) => r.id === id)).toMatchObject({ status: 'new', email: 'mario@prova.local' });

    await expect(updatePrivacyRequest(owner, id, { status: 'rejected' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await updatePrivacyRequest(owner, id, { status: 'done', resolutionNote: 'Dati anonimizzati, risposto via email' });
    const [row] = await getDb().select().from(privacyRequests).where(eq(privacyRequests.id, id));
    expect(row.status).toBe('done');
    expect(row.handledAt).not.toBeNull();
    // Nel registro solo id e tipo, mai nome o email.
    const logs = await getDb().select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(JSON.stringify(logs)).not.toContain('Rossi');
  });
});
