import type { Page } from '@playwright/test';
import { Client } from 'pg';
import { hashPassword } from '../src/server/auth/password';

// E2E_DATABASE_URL: un altro database locale che finisce in "_e2e", per lanciare i test in parallelo ad altri.
export const E2E_DB = process.env.E2E_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/proloco_e2e';
export const E2E_DB_NAME = new URL(E2E_DB).pathname.slice(1);
export const E2E_MAC_KEY = 'chiave-e2e-simulatore';

/** Query sul database e2e (solo localhost, solo un database che finisce in "_e2e"). */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Titolare dell'admin per i test che entrano da /login. */
export async function ensureOwner(email: string, password: string): Promise<void> {
  const [u] = await sql<{ id: string }>(
    `insert into users (email, name, password_hash) values ($1, 'Titolare e2e', $2)
     on conflict (email) do update set password_hash = excluded.password_hash, active = true returning id`,
    [email, hashPassword(password)],
  );
  await sql(`insert into role_assignments (user_id, role, edition_slug) values ($1, 'owner', null) on conflict do nothing`, [u.id]);
}

/** Entra nell'admin come titolare (creato al volo nel database e2e). */
export async function loginAsOwner(page: Page): Promise<void> {
  const email = 'titolare.e2e@example.com';
  const password = 'password-e2e-2099';
  await ensureOwner(email, password);
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}
