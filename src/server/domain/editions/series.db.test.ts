// Logo del format da Admin › Format (npm run test:db): si salva nel tema, si toglie, non tocca il resto.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { series } from '@/server/db/schema';
import { owner } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { listSeries, saveSeries } from './series';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('format: logo nel tema', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('salva e toglie i loghi; omessi restano; icona e font non si toccano; indirizzi non validi rifiutati', async () => {
    const slug = `fmt-${randomUUID().slice(0, 8)}`;
    const base = { name: 'Format di prova', slug, description: null, landingPath: null, dot: 'orange' as const };
    const { id } = await saveSeries(owner, null, { ...base, logo: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png' });
    await getDb().update(series).set({ theme: { dot: 'orange', logo: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png', mark: '/img/m.png', fontDisplay: 'outfit' } }).where(eq(series.id, id));

    await saveSeries(owner, id, { ...base, logoOnDark: '/img/bianco.png' });
    let [row] = await getDb().select().from(series).where(eq(series.id, id));
    expect(row.theme).toEqual({ dot: 'orange', logo: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png', logoOnDark: '/img/bianco.png', mark: '/img/m.png', fontDisplay: 'outfit' });
    expect((await listSeries()).find((s) => s.id === id)).toMatchObject({ logo: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png', logoOnDark: '/img/bianco.png' });

    await saveSeries(owner, id, { ...base, dot: 'blue', logo: null });
    [row] = await getDb().select().from(series).where(eq(series.id, id));
    expect(row.theme).toEqual({ dot: 'blue', logoOnDark: '/img/bianco.png', mark: '/img/m.png', fontDisplay: 'outfit' });

    await expect(saveSeries(owner, id, { ...base, logo: 'javascript:alert(1)' })).rejects.toMatchObject({ name: 'ZodError' });
  });
});
