// Editor dei blocchi della pagina pubblica: "Modifica" dal menu ⋯ e "Aggiungi blocco" aprono il pannello
// (prima si chiudeva subito) e il salvataggio scrive i blocchi. Database e2e del global-setup.
import { expect, test } from '@playwright/test';
import { loginAsOwner, sql } from './db';

test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

test('editor dei blocchi: "Modifica" e "Aggiungi blocco" aprono il pannello, poi si salva', async ({ page }) => {
  await loginAsOwner(page);
  await page.goto('/admin/e/e2e-semplice-2099/pagina');
  const blocks = page.getByRole('region', { name: 'Blocchi della pagina' });
  await expect(blocks.locator('ol > li').first()).toBeVisible();

  // Dal menu ⋯ della prima riga: il pannello resta aperto (prima si chiudeva subito, col focus tornato al menu).
  await page.getByRole('button', { name: /^Azioni: Copertina/ }).click();
  await page.getByRole('menuitem', { name: 'Modifica' }).click();
  const sheet = page.getByRole('dialog', { name: 'Copertina' });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(300);
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Sottotitolo', { exact: true }).fill('Sottotitolo dalla prova e2e');
  await expect(page.getByRole('region', { name: 'Anteprima' }).getByText('Sottotitolo dalla prova e2e')).toBeVisible();
  await sheet.getByRole('button', { name: 'Fatto' }).click();
  await expect(sheet).toBeHidden();

  // Un blocco nuovo si apre subito nel pannello.
  await page.getByRole('button', { name: 'Aggiungi blocco' }).click();
  await page.getByRole('menuitem', { name: /Domande frequenti/ }).click();
  const faq = page.getByRole('dialog', { name: 'Domande frequenti' });
  await expect(faq).toBeVisible();
  await page.waitForTimeout(300);
  await expect(faq).toBeVisible();
  await faq.getByLabel('Titolo', { exact: true }).fill('Domande della prova');
  await faq.getByRole('button', { name: 'Fatto' }).click();

  await page.getByRole('button', { name: /Salva/ }).first().click();
  await expect(page.getByText('Pagina salvata')).toBeVisible();
  const [row] = await sql<{ blocks: Array<{ type: string; props: Record<string, unknown> }> }>(`select page_blocks as blocks from editions where slug = 'e2e-semplice-2099'`);
  expect(row.blocks.find((b) => b.type === 'Hero')?.props.subtitle).toBe('Sottotitolo dalla prova e2e');
  expect(row.blocks.at(-1)).toMatchObject({ type: 'FAQ', props: { title: 'Domande della prova' } });
});
