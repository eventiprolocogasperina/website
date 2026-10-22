/**
 * Aggiunge al tema dei format già creati (series.theme) logo, icona e font del format, presi da
 * SERIES_THEMES (src/server/domain/editions/backfill.ts). Non cambia il pallino né i valori già impostati:
 * aggiunge solo le chiavi che mancano. Si può rilanciare.
 *
 *   npx tsx scripts/set-series-brand.ts               # prova: mostra cosa cambierebbe
 *   npx tsx scripts/set-series-brand.ts --conferma    # scrive davvero
 *
 * Usa POSTGRES_URL da .env.local. In produzione si lancia solo con il consenso di Niccolo (§18.4).
 */
import { config } from 'dotenv';
import { Client } from 'pg';
import { SERIES_THEMES } from '../src/server/domain/editions/backfill';

config({ path: '.env.local', quiet: true });

const write = process.argv.includes('--conferma');

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante in .env.local');
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    console.log(`Database: ${new URL(url).host}${new URL(url).pathname} · ${write ? 'SCRITTURA' : 'prova (aggiungi --conferma per scrivere)'}`);
    for (const [slug, theme] of Object.entries(SERIES_THEMES)) {
      const { rows } = await db.query<{ theme: Record<string, unknown> }>('select theme from series where slug = $1', [slug]);
      if (!rows[0]) {
        console.log(`- ${slug}: format non trovato, salto`);
        continue;
      }
      const missing = Object.fromEntries(Object.entries(theme).filter(([k]) => rows[0].theme?.[k] === undefined));
      if (!Object.keys(missing).length) {
        console.log(`- ${slug}: già a posto`);
        continue;
      }
      console.log(`- ${slug}: aggiungo ${JSON.stringify(missing)}`);
      // Le chiavi già presenti vincono (theme a destra di ||).
      if (write) await db.query('update series set theme = $2::jsonb || theme, updated_at = now() where slug = $1', [slug, JSON.stringify(missing)]);
    }
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
