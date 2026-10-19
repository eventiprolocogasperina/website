import { Client } from 'pg';

export const E2E_DB = 'postgres://postgres:postgres@localhost:5432/proloco_e2e';
export const E2E_MAC_KEY = 'chiave-e2e-simulatore';

/** Query sul database e2e (solo localhost, solo proloco_e2e). */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}
