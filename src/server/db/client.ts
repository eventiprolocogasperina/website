import 'server-only';
import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

function databaseUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante');
  return url;
}

let httpDb: ReturnType<typeof drizzleHttp<typeof schema>> | undefined;

/**
 * Client Drizzle su HTTP: una richiesta per query, adatto alle letture e alle scritture singole.
 * Creato alla prima chiamata, così la build non richiede POSTGRES_URL.
 */
export function getDb() {
  httpDb ??= drizzleHttp(neon(databaseUrl(), { fetchOptions: { cache: 'no-store' } }), { schema });
  return httpDb;
}

export type Tx = Parameters<Parameters<NeonDatabase<typeof schema>['transaction']>[0]>[0];

/**
 * Esegue `fn` in una transazione vera (WebSocket). Il pool vive solo per la durata della chiamata,
 * come consigliato per le funzioni serverless.
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    const db = drizzleWs(pool, { schema });
    return await db.transaction(fn);
  } finally {
    await pool.end();
  }
}
