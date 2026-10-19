// Segna la migrazione 0000_baseline come "già applicata" su un database che ha già le tabelle
// (la produzione), SENZA eseguirne l'SQL. Dopo, `npm run db:migrate` applica solo le successive.
//
// Uso (solo con il consenso di Niccolo quando si tratta della produzione, §18.4):
//   POSTGRES_URL=... node scripts/db/mark-baseline.mjs --conferma
//
// Prima di usarlo in produzione: `drizzle-kit pull` su un branch Neon della produzione e confronto
// con src/server/db/schema/legacy.ts. Se differiscono, la baseline va rigenerata.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local', quiet: true });

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error('POSTGRES_URL mancante');
  process.exit(1);
}

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
const baseline = journal.entries.find((e) => e.tag === '0000_baseline');
if (!baseline) {
  console.error('0000_baseline non trovata nel journal');
  process.exit(1);
}
const hash = createHash('sha256').update(readFileSync('drizzle/0000_baseline.sql', 'utf8')).digest('hex');
const host = new URL(url).host;

if (!process.argv.includes('--conferma')) {
  console.log(`Database: ${host}`);
  console.log(`Segnerei 0000_baseline come applicata (when=${baseline.when}). Rilancia con --conferma.`);
  process.exit(0);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(
    'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
  );
  const { rows } = await client.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations');
  if (rows[0].n > 0) {
    console.error(`Su ${host} ci sono già ${rows[0].n} migrazioni registrate: non faccio nulla.`);
    await client.query('ROLLBACK');
    process.exit(1);
  }
  const { rows: tables } = await client.query("SELECT to_regclass('public.orders') AS t");
  if (!tables[0].t) {
    console.error(`Su ${host} manca la tabella orders: è un database vuoto, usa npm run db:migrate.`);
    await client.query('ROLLBACK');
    process.exit(1);
  }
  await client.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [
    hash,
    baseline.when,
  ]);
  await client.query('COMMIT');
  console.log(`0000_baseline segnata come applicata su ${host}.`);
} finally {
  await client.end();
}
