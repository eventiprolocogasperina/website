// Checkout end-to-end con il simulatore di Nexi: acquisto completo (con fasce orarie e attività, e senza moduli),
// data esaurita, sconto, annullo e nuovo tentativo, ordine scaduto, notifica di pagamento doppia.
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { E2E_MAC_KEY, sql } from './db';

async function fillData(page: Page) {
  await page.getByLabel('Nome e cognome').fill('Maria Prova');
  await page.getByLabel('Email').fill('maria.prova@example.com');
}
async function acceptPrivacy(page: Page) {
  await page.getByRole('checkbox', { name: /informativa privacy/ }).click();
}
async function payWithSimulator(page: Page, choice: 'Paga' | 'Carta rifiutata' | 'Annulla' = 'Paga') {
  await page.getByRole('link', { name: 'Paga con carta' }).click();
  await expect(page.getByText('SIMULATORE: nessun pagamento vero')).toBeVisible();
  await page.getByRole('button', { name: choice, exact: true }).click();
}

test('acquisto completo con data, bambini, attività e promemoria del laboratorio', async ({ page }) => {
  await page.goto('/acquista/e2e-zucche-2099');
  await expect(page.getByRole('heading', { name: 'Festa delle Zucche 2099' })).toBeVisible();
  await page.getByRole('radio', { name: /Sab 17 ott 2099/ }).click();
  await page.getByRole('button', { name: 'Aggiungi un Ingresso' }).click();
  await page.getByRole('button', { name: 'Aggiungi un Ingresso' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();

  await fillData(page);
  await page.getByLabel('Quanti bambini ci sono?').fill('1');
  await page.getByRole('checkbox', { name: /Zucca in Vaso/ }).click();
  await acceptPrivacy(page);
  await page.getByRole('button', { name: 'Continua' }).click();
  // Promemoria del laboratorio a pagamento, una volta sola.
  await expect(page.getByTestId('errore')).toContainText('Laboratorio zucca');
  await page.getByRole('button', { name: 'Continua' }).click();

  await expect(page.getByTestId('totale')).toHaveText('10,00 €');
  await page.getByRole('button', { name: 'Vai al pagamento' }).click();
  await expect(page.getByText(/Ti teniamo i posti per/)).toBeVisible();
  await payWithSimulator(page);

  await expect(page.getByRole('heading', { name: 'Ordine confermato' })).toBeVisible();
  const code = (await page.getByTestId('codice-ordine').textContent())!;
  const [order] = await sql<{ status: string; n: number }>(
    `select o.status, (select count(*)::int from tickets_v2 t where t.order_id = o.id) n from orders_v2 o where code = $1`,
    [code],
  );
  expect(order).toEqual({ status: 'paid', n: 2 });
  const answers = await sql<{ question_key: string; value: unknown }>(`select question_key, value from attendee_answers a join orders_v2 o on o.id = a.order_id where o.code = $1 order by question_key`, [code]);
  expect(answers).toEqual([
    { question_key: 'attivita', value: ['zucca_vaso'] },
    { question_key: 'bambini', value: 1 },
  ]);

  await page.getByRole('link', { name: 'I miei biglietti' }).click();
  await expect(page.getByRole('img', { name: /QR del biglietto 1/ })).toBeVisible();
  const pdf = await page.request.get(page.url() + '/biglietti.pdf');
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  const ics = await page.request.get(page.url() + '/calendario.ics');
  expect(await ics.text()).toContain('DTSTART:20991017T130000Z');
});

test('edizione senza moduli: un biglietto senza data', async ({ page }) => {
  await page.goto('/acquista/e2e-semplice-2099');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Aggiungi un Posto unico' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await fillData(page);
  await acceptPrivacy(page);
  await page.getByRole('button', { name: 'Continua' }).click();
  await expect(page.getByTestId('totale')).toHaveText('8,00 €');
  await page.getByRole('button', { name: 'Vai al pagamento' }).click();
  await payWithSimulator(page);
  await expect(page.getByRole('heading', { name: 'Ordine confermato' })).toBeVisible();
});

test('data esaurita non selezionabile', async ({ page }) => {
  await page.goto('/acquista/e2e-zucche-2099');
  const sold = page.getByRole('radio', { name: /Dom 18 ott 2099/ });
  await expect(sold).toBeDisabled();
  await expect(page.getByText('Esaurito').first()).toBeVisible();
});

test('codice sconto ricalcolato dal server', async ({ page }) => {
  await page.goto('/acquista/e2e-zucche-2099');
  await page.getByRole('radio', { name: /Sab 17 ott 2099/ }).click();
  await page.getByRole('button', { name: 'Aggiungi un Ingresso' }).click();
  await page.getByRole('button', { name: 'Aggiungi un Laboratorio zucca' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await fillData(page);
  await acceptPrivacy(page);
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Continua' }).click(); // promemoria attività
  await expect(page.getByTestId('totale')).toHaveText('8,00 €');
  await page.getByLabel('Codice sconto').fill('nonvale');
  await page.getByRole('button', { name: 'Applica' }).click();
  await expect(page.getByTestId('errore')).toContainText('codice sconto');
  await page.getByLabel('Codice sconto').fill('e2e10');
  await page.getByRole('button', { name: 'Applica' }).click();
  await expect(page.getByTestId('totale')).toHaveText('7,20 €');
});

test('pagamento annullato e poi riprovato', async ({ page }) => {
  await page.goto('/acquista/e2e-semplice-2099');
  await page.getByRole('button', { name: 'Aggiungi un Posto unico' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await fillData(page);
  await acceptPrivacy(page);
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Vai al pagamento' }).click();
  await payWithSimulator(page, 'Annulla');
  await expect(page.getByRole('heading', { name: 'Pagamento annullato' })).toBeVisible();
  await page.getByRole('link', { name: 'Riprova il pagamento' }).click();
  await page.getByRole('button', { name: 'Carta rifiutata', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Il pagamento non è andato a buon fine' })).toBeVisible();
  await page.getByRole('link', { name: 'Riprova il pagamento' }).click();
  await page.getByRole('button', { name: 'Paga', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ordine confermato' })).toBeVisible();
});

test('ordine scaduto: il pagamento non parte e si ricomincia', async ({ page }) => {
  await page.goto('/acquista/e2e-semplice-2099');
  await page.getByRole('button', { name: 'Aggiungi un Posto unico' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await fillData(page);
  await acceptPrivacy(page);
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Vai al pagamento' }).click();
  const href = await page.getByRole('link', { name: 'Paga con carta' }).getAttribute('href');
  const token = href!.split('/').pop()!;
  await sql(`update orders_v2 set expires_at = now() - interval '1 minute' where access_token = $1`, [token]);
  await page.goto(href!);
  await expect(page.getByRole('heading', { name: 'Il tempo per pagare è scaduto' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ricomincia l’acquisto/ })).toBeVisible();
});

test('notifica di pagamento doppia: un solo pagamento', async ({ page, request }) => {
  await page.goto('/acquista/e2e-semplice-2099');
  await page.getByRole('button', { name: 'Aggiungi un Posto unico' }).click();
  await page.getByRole('button', { name: 'Continua' }).click();
  await fillData(page);
  await acceptPrivacy(page);
  await page.getByRole('button', { name: 'Continua' }).click();
  await page.getByRole('button', { name: 'Vai al pagamento' }).click();
  await payWithSimulator(page);
  await expect(page.getByRole('heading', { name: 'Ordine confermato' })).toBeVisible();
  const code = (await page.getByTestId('codice-ordine').textContent())!;
  const [p] = await sql<{ raw: Record<string, string>; order_id: string }>(`select p.raw, p.order_id from payments p join orders_v2 o on o.id = p.order_id where o.code = $1`, [code]);
  const fields: Record<string, string> = { codTrans: p.raw.codTrans, esito: 'OK', importo: p.raw.importo, divisa: 'EUR', data: p.raw.data, orario: p.raw.orario, codAut: p.raw.codAut };
  const mac = createHash('sha1')
    .update(`${['codTrans', 'esito', 'importo', 'divisa', 'data', 'orario', 'codAut'].map((k) => `${k}=${fields[k]}`).join('')}${E2E_MAC_KEY}`)
    .digest('hex');
  for (let i = 0; i < 2; i++) {
    const res = await request.post('/api/pagamenti/nexi/notifica', { form: { ...fields, mac } });
    expect(await res.text()).toBe('OK');
  }
  const bad = await request.post('/api/pagamenti/nexi/notifica', { form: { ...fields, mac: '0'.repeat(40) } });
  expect(bad.status()).toBe(400);
  const rows = await sql(`select status from payments where order_id = $1`, [p.order_id]);
  expect(rows).toEqual([{ status: 'succeeded' }]);
});
