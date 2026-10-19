// Sostituto di src/server/db/client.ts nei test di dominio: stesso contratto (getDb, withTransaction),
// ma con il driver `pg` su un Postgres locale invece del driver Neon.
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/server/db/schema';

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function instance() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL mancante');
  pool ??= new Pool({ connectionString: url, max: 10 });
  db ??= drizzle(pool, { schema });
  return db;
}

export function getDb() {
  return instance();
}

export async function withTransaction<T>(fn: (tx: never) => Promise<T>): Promise<T> {
  return instance().transaction((tx) => fn(tx as never));
}

export async function closeTestDb() {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
