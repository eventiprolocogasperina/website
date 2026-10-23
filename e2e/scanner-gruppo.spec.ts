// Scanner: il QR apre tutto l'ordine; l'operatore toglie chi non c'è e conferma "Fai entrare N".
// Database e2e del global-setup.
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { loginAsOwner, sql } from './db';

test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

test('scanner: un QR fa entrare tutto l’ordine dopo la conferma, togliendo chi non c’è', async ({ page }) => {
  const [ed] = await sql<{ id: string; product: string }>(`select e.id, p.id as product from editions e join products p on p.edition_id = e.id where e.slug = 'e2e-semplice-2099'`);
  const [list] = await sql<{ id: string }>(`insert into checkin_lists (edition_id, name, product_ids) values ($1, 'Ingresso gruppo', $2) returning id`, [ed.id, [ed.product]]);
  const [customer] = await sql<{ id: string }>(`insert into customers (email, name) values ('gruppo.e2e@example.com', 'Famiglia Gruppo') returning id`);
  const code = `E2E-${randomBytes(2).toString('hex').toUpperCase()}`;
  const [order] = await sql<{ id: string }>(
    `insert into orders_v2 (code, edition_id, channel, status, subtotal_cents, total_cents, access_token, customer_id)
     values ($1, $2, 'admin', 'paid', 2400, 2400, $3, $4) returning id`,
    [code, ed.id, randomBytes(16).toString('hex'), customer.id],
  );
  const [line] = await sql<{ id: string }>(`insert into order_lines (order_id, product_id, quantity, unit_price_cents, total_cents) values ($1, $2, 3, 800, 2400) returning id`, [order.id, ed.product]);
  const tickets: Array<{ id: string; qr: string }> = [];
  for (const name of ['Anna', 'Bruno', 'Carla']) {
    const qr = randomBytes(18).toString('base64url');
    const [t] = await sql<{ id: string }>(`insert into tickets_v2 (order_id, order_line_id, edition_id, product_id, qr_token, attendee_name) values ($1, $2, $3, $4, $5, $6) returning id`, [order.id, line.id, ed.id, ed.product, qr, `${name} Gruppo`]);
    tickets.push({ id: t.id, qr });
  }
  const entered = async () => (await sql<{ ticket_id: string }>(`select ticket_id from checkins where checkin_list_id = $1 and reverted_at is null`, [list.id])).map((r) => r.ticket_id);

  await loginAsOwner(page);
  await page.goto('/scanner/nuovo?edizione=e2e-semplice-2099');
  await page.evaluate((c) => localStorage.setItem('scanner:scelta:v1', JSON.stringify(c)), { edition: 'e2e-semplice-2099', listId: list.id, sessionId: null });
  await page.reload();

  // Il QR del primo biglietto (quello al centro dell'email): l'ordine con tutti e tre, spuntati.
  await page.getByLabel('Cerca per nome o codice').fill(tickets[0].qr);
  await page.getByRole('button', { name: 'Cerca' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Conferma ingresso');
  await expect(dialog).toContainText(`Ordine ${code}`);
  await expect(dialog.getByRole('checkbox')).toHaveCount(3);
  expect(await entered()).toEqual([]);

  // Carla non c'è: si toglie la spunta.
  await dialog.getByRole('checkbox', { name: /Carla Gruppo/ }).click();
  await expect(dialog.getByRole('checkbox', { name: /Carla Gruppo/ })).toHaveAttribute('aria-checked', 'false');
  await dialog.getByRole('button', { name: 'Fai entrare 2' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('ENTRANO IN 2');
  expect((await entered()).sort()).toEqual([tickets[0].id, tickets[1].id].sort());
  const logs = await sql(`select 1 from audit_log where action = 'ticket.checked_in' and entity_id = any($1)`, [[tickets[0].id, tickets[1].id]]);
  expect(logs).toHaveLength(2);
  await page.getByRole('button', { name: 'Continua' }).click();

  // Carla arriva dopo con il suo QR: i primi due sono grigi, "Già entrato"; entra solo lei.
  await page.getByLabel('Cerca per nome o codice').fill(tickets[2].qr);
  await page.getByRole('button', { name: 'Cerca' }).click();
  await expect(dialog.getByText(/Già entrato alle/)).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Fai entrare 1' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('VALIDO');
  expect(await entered()).toHaveLength(3);
});
