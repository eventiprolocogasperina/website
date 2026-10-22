import { Client } from 'pg';

/** Nome del database e2e: E2E_DB_NAME permette a più worktree di avere ciascuno il proprio (predefinito proloco_e2e). */
export const E2E_DB_NAME = process.env.E2E_DB_NAME || 'proloco_e2e';
if (!/^[a-z0-9_]+$/.test(E2E_DB_NAME) || !E2E_DB_NAME.endsWith('_e2e')) throw new Error('E2E_DB_NAME deve finire con _e2e');
export const E2E_DB = `postgres://postgres:postgres@localhost:5432/${E2E_DB_NAME}`;
export const E2E_MAC_KEY = 'chiave-e2e-simulatore';

/** Query sul database e2e (solo localhost, solo un database *_e2e). */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}
