// Scanner: un ingresso si annulla anche dopo i 30 secondi di "Annulla ultimo", con conferma,
// dalla ricerca e dall'esito "Già entrato". Database e2e del global-setup.
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { loginAsOwner, sql } from './db';

test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

test('scanner: un ingresso si annulla anche dopo, dalla ricerca e da "Già entrato", con conferma', async ({ page }) => {
  // Un ordine pagato con un biglietto già entrato da tempo, sulla lista Ingresso dell'edizione semplice.
  const [ed] = await sql<{ id: string; product: string }>(`select e.id, p.id as product from editions e join products p on p.edition_id = e.id where e.slug = 'e2e-semplice-2099'`);
  const [list] = await sql<{ id: string }>(`insert into checkin_lists (edition_id, name, product_ids) values ($1, 'Ingresso', $2) returning id`, [ed.id, [ed.product]]);
  const [customer] = await sql<{ id: string }>(`insert into customers (email, name) values ('ingresso.e2e@example.com', 'Lucia Annullo') returning id`);
  const code = `E2E-${randomBytes(2).toString('hex').toUpperCase()}`;
  const [order] = await sql<{ id: string }>(
    `insert into orders_v2 (code, edition_id, channel, status, subtotal_cents, total_cents, access_token, customer_id)
     values ($1, $2, 'admin', 'paid', 800, 800, $3, $4) returning id`,
    [code, ed.id, randomBytes(16).toString('hex'), customer.id],
  );
  const [line] = await sql<{ id: string }>(`insert into order_lines (order_id, product_id, quantity, unit_price_cents, total_cents) values ($1, $2, 1, 800, 800) returning id`, [order.id, ed.product]);
  const qr = randomBytes(18).toString('base64url');
  const [ticket] = await sql<{ id: string }>(`insert into tickets_v2 (order_id, order_line_id, edition_id, product_id, qr_token) values ($1, $2, $3, $4, $5) returning id`, [order.id, line.id, ed.id, ed.product, qr]);
  await sql(`insert into checkins (ticket_id, checkin_list_id, at) values ($1, $2, now() - interval '20 minutes')`, [ticket.id, list.id]);

  await loginAsOwner(page);
  await page.goto('/scanner/nuovo?edizione=e2e-semplice-2099');
  await page.evaluate((c) => localStorage.setItem('scanner:scelta:v1', JSON.stringify(c)), { edition: 'e2e-semplice-2099', listId: list.id, sessionId: null });
  await page.reload();

  // Dalla ricerca: "Annulla ingresso" chiede conferma; "Lascia entrato" non cambia niente.
  await page.getByLabel('Cerca per nome o codice').fill(code);
  await page.getByRole('button', { name: 'Cerca' }).click();
  await page.getByRole('button', { name: 'Annulla ingresso' }).click();
  await expect(page.getByText('Annullare questo ingresso?')).toBeVisible();
  await page.getByRole('button', { name: 'Lascia entrato' }).click();
  expect(await sql(`select 1 from checkins where ticket_id = $1 and reverted_at is null`, [ticket.id])).toHaveLength(1);

  await page.getByRole('button', { name: 'Annulla ingresso' }).click();
  await page.getByRole('button', { name: 'Annulla l’ingresso' }).click();
  await expect(page.getByRole('button', { name: 'Fai entrare' })).toBeVisible();
  const reverted = await sql<{ reverted_at: Date | null }>(`select reverted_at from checkins where ticket_id = $1`, [ticket.id]);
  expect(reverted).toHaveLength(1);
  expect(reverted[0].reverted_at).not.toBeNull();
  const [log] = await sql<{ reason: string }>(`select reason from audit_log where entity_id = $1 and action = 'ticket.checkin_reverted'`, [ticket.id]);
  expect(log.reason).toBe('Annullato dopo, dalla ricerca dello scanner');

  // Rientra, poi dal secondo passaggio ("Già entrato") si annulla di nuovo.
  await page.getByRole('button', { name: 'Fai entrare' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('VALIDO');
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByLabel('Cerca per nome o codice').fill(qr);
  await page.getByRole('button', { name: 'Cerca' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('GIÀ ENTRATO');
  await page.getByRole('button', { name: 'Annulla questo ingresso' }).click();
  await page.getByRole('button', { name: 'Annulla l’ingresso' }).click();
  await expect(page.getByText('GIÀ ENTRATO')).toBeHidden();
  expect(await sql(`select 1 from checkins where ticket_id = $1 and reverted_at is null`, [ticket.id])).toHaveLength(0);
  expect(await sql(`select 1 from checkins where ticket_id = $1`, [ticket.id])).toHaveLength(2);
});
