// Procedura guidata "Nuova edizione": dal format si parte dall'edizione precedente, si saltano i passi
// facoltativi, si pubblica e si aprono le vendite; la panoramica mostra "Da completare". Database e2e.
import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { loginAsOwner, sql } from './db';

test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

const SHOTS = process.env.E2E_SCREENSHOTS;

test('nuova edizione dall’edizione precedente, con passi saltati', async ({ page }) => {
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const shot = async (name: string) => {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  };
  const n = Math.random().toString(36).slice(2, 7);
  const [s] = await sql<{ id: string }>(`insert into series (slug, name, theme) values ($1, $2, '{"dot":"orange"}') returning id`, [`zucche-${n}`, `Festa delle Zucche ${n}`]);
  const blocks = [
    { id: 'h', type: 'Hero', hidden: false, props: { title: `Festa delle Zucche ${n} 2098` } },
    { id: 'a', type: 'Allegati', hidden: false, props: { title: 'Allegati', items: [{ label: 'Regolamento', url: 'https://example.com/regolamento.pdf' }] } },
  ];
  const [old] = await sql<{ id: string }>(
    `insert into editions (slug, series_id, year, title, status, starts_at, location, page_blocks, enabled_modules)
     values ($1, $2, 2098, $3, 'archived', '2098-10-18T08:00:00Z', 'Gasperina', $4, '{time-slots}') returning id`,
    [`zucche-${n}-2098`, s.id, `Festa delle Zucche ${n} 2098`, JSON.stringify(blocks)],
  );
  await sql(`insert into sessions (edition_id, label, starts_at, capacity) values ($1, 'Sab 18 ott', '2098-10-18T08:00:00Z', 300), ($1, 'Dom 19 ott', '2098-10-19T08:00:00Z', 300)`, [old.id]);
  await sql(`insert into products (edition_id, kind, name, price_cents, channels, requires_session, issues_ticket) values ($1, 'ticket', 'Intero', 600, '{online,pos}', true, true)`, [old.id]);

  await loginAsOwner(page);
  await page.goto('/admin/edizioni');
  await page.getByRole('link', { name: 'Nuova edizione' }).first().click();
  await expect(page.getByRole('heading', { name: 'Nuova edizione' })).toBeVisible();
  await page.getByLabel(`Festa delle Zucche ${n}`).click();
  await shot('1-tipo-di-evento');
  await page.getByRole('button', { name: 'Continua' }).click();

  await expect(page.getByText(`Parti da Festa delle Zucche ${n} 2098`)).toBeVisible();
  await page.getByLabel('Anno').fill('2099');
  await expect(page.getByLabel('Titolo')).toHaveValue(`Festa delle Zucche ${n} 2099`);
  await shot('2-parti-dall-edizione-precedente');
  await page.getByRole('button', { name: 'Crea la bozza e continua' }).click();

  // La procedura riprende dal primo passo da fare: date e biglietti sono già copiati.
  await page.waitForURL(/\/procedura\/extra$/);
  await page.getByRole('navigation', { name: 'Passi della procedura' }).getByRole('link', { name: /Date e luogo/ }).click();
  await page.waitForURL(/\/procedura\/date$/);
  await expect(page.getByTestId('step-detail')).toHaveText('2 date · 600 posti · Gasperina');
  await page.getByRole('button', { name: 'Salva e continua' }).click();
  await page.waitForURL(/\/procedura\/biglietti$/);
  await expect(page.getByTestId('step-detail')).toContainText('1 biglietto');
  await page.getByRole('button', { name: 'Salva e continua' }).click();

  // Extra: facoltativo, si salta.
  await page.waitForURL(/\/procedura\/extra$/);
  await page.getByRole('button', { name: 'Salta per ora' }).click();
  // Pagina e regolamento arrivano dall'edizione precedente.
  await page.waitForURL(/\/procedura\/pagina$/);
  await expect(page.getByTestId('step-detail')).toHaveText('2 blocchi nella pagina');
  await page.getByRole('button', { name: 'Salva e continua' }).click();
  await page.waitForURL(/\/procedura\/regolamento$/);
  await expect(page.getByLabel('Link al regolamento')).toHaveValue('https://example.com/regolamento.pdf');
  await page.getByRole('button', { name: 'Salva e continua' }).click();
  await page.waitForURL(/\/procedura\/casse$/);
  await page.getByRole('button', { name: 'Salta per ora' }).click();
  await page.waitForURL(/\/procedura\/sconti$/);
  await page.getByRole('button', { name: 'Salta per ora' }).click();

  // Pubblica e apri le vendite.
  await page.waitForURL(/\/procedura\/pubblica$/);
  await page.getByRole('button', { name: 'Pubblica l’edizione' }).click();
  await expect(page.getByRole('button', { name: 'Apri le vendite' })).toBeEnabled();
  await shot('3-pubblica-e-apri-le-vendite');

  // La panoramica (ancora pubblicata) mostra la checklist con i passi saltati.
  await page.goto(`/admin/e/festa-delle-zucche-${n}-2099`);
  const list = page.getByRole('list', { name: 'Passi da completare' });
  await expect(list.getByRole('listitem')).toHaveCount(8);
  await expect(list.getByRole('listitem').filter({ hasText: 'Casse' })).toContainText('Saltato');
  await expect(list.getByRole('listitem').filter({ hasText: 'Date e luogo' })).toContainText('Fatto');
  await shot('4-da-completare');

  const [copy] = await sql<{ status: string; orders: number }>(
    `select e.status, (select count(*)::int from orders_v2 o where o.edition_id = e.id) as orders from editions e where slug = $1`,
    [`festa-delle-zucche-${n}-2099`],
  );
  expect(copy).toEqual({ status: 'published', orders: 0 });
  const [src] = await sql<{ status: string }>(`select status from editions where id = $1`, [old.id]);
  expect(src.status).toBe('archived');
});
