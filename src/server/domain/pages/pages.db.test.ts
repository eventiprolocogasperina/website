// Pagine a blocchi e "Avvisami" su un Postgres vero: salvataggio con controllo di versione, edizione
// archiviata in sola lettura, iscrizione idempotente e un solo avviso per iscritto anche in parallelo.
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { newBlock } from '@/components/public/blocks/schema';
import { editions, notifySignups, series } from '@/server/db/schema';
import { changeEditionStatus } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';
import * as send from '@/server/email/send';
import { createEdition, makeSalesReady, owner, roleOn } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { blocksVersion, getEditionYearPage, getFormatPage, saveEditionBlocks, saveSeriesBlocks } from './index';
import { notifyEditionOnSale, subscribeNotify, unsubscribeNotify } from './notify';

const enabled = !!process.env.TEST_DATABASE_URL;
const code = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e instanceof DomainError ? e.code : (e as Error).name));

async function format(slug: string) {
  const [s] = await getDb().insert(series).values({ slug, name: `Format ${slug}`, landingPath: `/${slug}`, theme: { dot: 'orange' } }).returning();
  return s;
}

describe.skipIf(!enabled)('pagine a blocchi', () => {
  afterAll(() => closeTestDb());

  it('salva i blocchi, rifiuta versioni vecchie, permessi ed edizioni archiviate', async () => {
    const f = await createEdition({ status: 'published' });
    const blocks = [newBlock('Hero', { title: 'Ciao' }), newBlock('FAQ', {})];
    const v0 = blocksVersion([]);
    expect(await code(saveEditionBlocks(roleOn('cashier', f.slug), f.slug, blocks, v0))).toBe('FORBIDDEN');
    const { version } = await saveEditionBlocks(owner, f.slug, blocks, v0);
    expect(await code(saveEditionBlocks(owner, f.slug, blocks, v0))).toBe('CONFLICT');
    expect(await code(saveEditionBlocks(owner, f.slug, [{ id: 'x', type: 'Video', props: { url: 'javascript:1' } }], version))).toBe('ZodError');
    await getDb().update(editions).set({ status: 'archived' }).where(eq(editions.id, f.edition.id));
    expect(await code(saveEditionBlocks(owner, f.slug, blocks, version))).toBe('EDITION_ARCHIVED');
  });

  it('/<format> sceglie l’edizione in corso o la pagina fuori stagione; /<format>/<anno> l’edizione', async () => {
    const s = await format(`fmt-${Date.now()}`);
    const off = await getFormatPage(s.landingPath!, { legacyPageLive: false });
    expect(off?.edition).toBeNull();
    expect(off?.blocks.some((b) => b.type === 'Avvisami')).toBe(true);
    await saveSeriesBlocks(owner, s.slug, [newBlock('RichText', { title: 'Fuori stagione' })], blocksVersion([]));
    expect((await getFormatPage(s.landingPath!, { legacyPageLive: false }))?.blocks[0].type).toBe('RichText');

    const f = await createEdition({ status: 'draft' });
    await getDb().update(editions).set({ seriesId: s.id, year: 2031 }).where(eq(editions.id, f.edition.id));
    expect((await getFormatPage(s.landingPath!, { legacyPageLive: false }))?.edition).toBeNull(); // bozza: non pubblica
    expect(await getEditionYearPage(s.landingPath!, 2031, { legacyPageLive: false })).toBeNull();
    await getDb().update(editions).set({ status: 'on_sale' }).where(eq(editions.id, f.edition.id));
    const page = await getFormatPage(s.landingPath!, { legacyPageLive: false });
    expect(page?.edition?.id).toBe(f.edition.id);
    expect(page?.data.prices.map((p) => p.name)).toContain(f.ticket.name);
    expect((await getEditionYearPage(s.landingPath!, 2031, { legacyPageLive: false }))?.edition?.id).toBe(f.edition.id);
  });

  it('Avvisami: iscrizione idempotente, una sola email per edizione anche in parallelo, disiscrizione', async () => {
    const spy = vi.spyOn(send, 'sendEmail');
    spy.mockClear();
    const s = await format(`avv-${Date.now()}`);
    await subscribeNotify({ seriesId: s.id, email: 'Anna@Esempio.it', consent: true });
    await subscribeNotify({ seriesId: s.id, email: 'anna@esempio.it', consent: true });
    await subscribeNotify({ seriesId: s.id, email: 'bruno@esempio.it', consent: true });
    expect(await code(subscribeNotify({ seriesId: s.id, email: 'c@esempio.it', consent: false as true }))).toBe('ZodError');
    const rows = await getDb().select().from(notifySignups).where(eq(notifySignups.seriesId, s.id));
    expect(rows).toHaveLength(2);

    const f = await createEdition({ status: 'published' });
    await makeSalesReady(f.edition.id);
    await getDb().update(editions).set({ seriesId: s.id }).where(eq(editions.id, f.edition.id));
    const sent = await Promise.all([notifyEditionOnSale(f.edition.id), notifyEditionOnSale(f.edition.id)]);
    expect(sent[0] + sent[1]).toBe(2);
    expect(spy).toHaveBeenCalledTimes(2);

    // Il passaggio vero a on_sale pubblica l'evento: nessuno riceve una seconda email della stessa edizione.
    await changeEditionStatus(owner, f.slug, { to: 'on_sale' });
    expect(spy).toHaveBeenCalledTimes(2);

    expect(await unsubscribeNotify(rows[0].unsubscribeToken)).toBe(s.name);
    expect(await unsubscribeNotify('token-che-non-esiste-affatto')).toBeNull();
    const g = await createEdition({ status: 'published' });
    await makeSalesReady(g.edition.id);
    await getDb().update(editions).set({ seriesId: s.id }).where(eq(editions.id, g.edition.id));
    await changeEditionStatus(owner, g.slug, { to: 'on_sale' });
    expect(spy).toHaveBeenCalledTimes(3); // solo chi è ancora iscritto
  });
});
