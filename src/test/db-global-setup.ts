// Prepara il database dei test di dominio: lo ricrea vuoto e applica tutte le migrazioni di drizzle/.
// Si usa solo con TEST_DATABASE_URL (npm run test:db). Rifiuta qualsiasi indirizzo che non sia
// localhost o un database che non finisca in "_test": non deve mai toccare Neon (§18).
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

export function assertTestDatabase(raw: string): URL {
  const url = new URL(raw);
  const db = url.pathname.slice(1);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !db.endsWith('_test')) {
    throw new Error(`TEST_DATABASE_URL deve puntare a un database locale che finisce in "_test" (trovato ${url.hostname}/${db}).`);
  }
  return url;
}

export default async function setup() {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) return;
  const url = assertTestDatabase(raw);
  const name = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${name}"`);
  await client.end();

  const target = new Client({ connectionString: url.toString() });
  await target.connect();
  await migrate(drizzle(target), { migrationsFolder: 'drizzle' });
  await target.end();
}
