/**
 * Copia i codici sconto di oggi (tabella `discounts`) nel catalogo nuovo (`discounts_v2`), che è quello
 * letto dal checkout unico. Copia, non sposta: la tabella di oggi resta com'è. Si può rilanciare: un
 * codice già copiato non viene ricreato, ma i suoi utilizzi si allineano al valore più alto.
 *
 *   npm run migrate:discounts               # prova: elenca cosa copierebbe e annulla tutto
 *   npm run migrate:discounts -- --conferma # scrive davvero
 *
 * Ambito di oggi → nuovo: ALL = tutte le edizioni; ZUCCALAND_ONLY = zuccaland-2026;
 * FULL_TICKET = assaggia-e-passeggia-2026. Usa POSTGRES_URL da .env.local. In produzione solo con il
 * consenso di Niccolo, dopo aver letto la prova (§18.4).
 */
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local', quiet: true });

const write = process.argv.includes('--conferma');

type LegacyDiscount = {
  code: string;
  type: string;
  value: string | number;
  max_uses: number | null;
  current_uses: number | null;
  expiry_date: Date | null;
  active: boolean | null;
  applies_to: string | null;
};

const SCOPE_EDITION: Record<string, string | null> = {
  ALL: null,
  ZUCCALAND_ONLY: 'zuccaland-2026',
  FULL_TICKET: 'assaggia-e-passeggia-2026',
};

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante in .env.local');
  const db = new Client({ connectionString: url });
  await db.connect();
  console.log(`Database: ${new URL(url).host}${write ? '' : ' (prova)'}\n`);

  try {
    await db.query('begin');
    const editions = new Map(
      (await db.query<{ id: string; slug: string }>('select id, slug from editions')).rows.map((e) => [e.slug, e.id]),
    );
    const legacy = (
      await db.query<LegacyDiscount>('select code, type, value, max_uses, current_uses, expiry_date, active, applies_to from discounts order by code')
    ).rows;

    let copied = 0;
    const skipped: string[] = [];
    for (const d of legacy) {
      const code = d.code.trim().toUpperCase();
      const percent = String(d.type).toUpperCase() === 'PERCENTAGE';
      const raw = Number(d.value);
      const value = percent ? Math.round(raw) : Math.round(raw * 100);
      const scope = d.applies_to || 'ALL';
      if (!(scope in SCOPE_EDITION)) {
        skipped.push(`${code}: ambito "${scope}" sconosciuto`);
        continue;
      }
      const slug = SCOPE_EDITION[scope];
      const editionId = slug ? editions.get(slug) : null;
      if (slug && !editionId) {
        skipped.push(`${code}: manca l'edizione ${slug} (lancia prima backfill:editions)`);
        continue;
      }
      if (!Number.isFinite(value) || value <= 0 || (percent && value > 100)) {
        skipped.push(`${code}: valore ${d.value} non valido`);
        continue;
      }
      await db.query(
        `insert into discounts_v2 (edition_id, code, kind, value, max_uses, used_count, valid_until, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (code) do update set used_count = greatest(discounts_v2.used_count, excluded.used_count), updated_at = now()`,
        [editionId, code, percent ? 'percent' : 'fixed', value, d.max_uses && d.max_uses > 0 ? d.max_uses : null, d.current_uses ?? 0, d.expiry_date, d.active ?? true],
      );
      copied++;
      console.log(`  ${code}: ${percent ? `${value}%` : `${(value / 100).toFixed(2)} €`}, ${slug ?? 'tutte le edizioni'}, usi ${d.current_uses ?? 0}/${d.max_uses || '∞'}${d.active === false ? ', spento' : ''}`);
    }

    console.log(`\nCopiati ${copied} codici su ${legacy.length}.`);
    for (const s of skipped) console.log(`  Saltato ${s}`);
    await db.query(write ? 'commit' : 'rollback');
    if (!write) console.log('\nProva: nulla è stato scritto. Rilancia con --conferma.');
  } catch (error) {
    await db.query('rollback');
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
