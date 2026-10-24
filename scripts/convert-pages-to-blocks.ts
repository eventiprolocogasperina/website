/**
 * Prompt 17, punto 6: converte le pagine di oggi in blocchi.
 *   - pages_content['zuccaland']            → editions.page_blocks di zuccaland-2026 e series.page_blocks di zuccaland
 *   - pages_content['assaggia-e-passeggia'] → editions.page_blocks di assaggia-e-passeggia-2026
 *   - pagina "Grazie" di /assaggia-e-passeggia → series.page_blocks di assaggia-e-passeggia
 * Non tocca pages_content né le pagine di oggi. Scrive solo dove non ci sono già blocchi (salvo --sovrascrivi).
 * La migrazione scrive anche nell'edizione archiviata A&P 2026: è contenuto importato, non una modifica (§19).
 *
 *   npx tsx scripts/convert-pages-to-blocks.ts                 # prova: mostra cosa farebbe
 *   npx tsx scripts/convert-pages-to-blocks.ts --conferma      # scrive davvero
 *
 * Usa POSTGRES_URL da .env.local. In produzione solo con il consenso di Niccolo (§18.4).
 */
import { config } from 'dotenv';
import { Client } from 'pg';
import gallery from '../src/lib/data/assaggia-2026-gallery.json';
import { DEFAULT_ASSAGGIA_CONTENT, DEFAULT_ZUCCALAND_CONTENT, type AssaggiaEPasseggiaContent, type ZuccalandContent } from '../src/lib/data/pages';
import { PageBlocksSchema, type Block } from '../src/components/public/blocks/schema';
import { assaggiaEditionBlocks, assaggiaOffseasonBlocks, zuccalandEditionBlocks, zuccalandOffseasonBlocks } from '../src/server/domain/pages/convert';

config({ path: '.env.local', quiet: true });
const write = process.argv.includes('--conferma');
const overwrite = process.argv.includes('--sovrascrivi');

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante in .env.local');
  const db = new Client({ connectionString: url });
  await db.connect();
  const pages = (await db.query<{ slug: string; content: Record<string, unknown> }>(`select slug, content from pages_content where slug in ('zuccaland', 'assaggia-e-passeggia')`)).rows;
  const raw = (slug: string) => pages.find((p) => p.slug === slug)?.content ?? {};
  // Stessa fusione con i valori predefiniti che fanno le pagine di oggi.
  const z = { ...DEFAULT_ZUCCALAND_CONTENT, ...raw('zuccaland') } as ZuccalandContent;
  const ap = { ...DEFAULT_ASSAGGIA_CONTENT, ...raw('assaggia-e-passeggia') } as AssaggiaEPasseggiaContent;

  const targets: Array<{ table: 'editions' | 'series'; slug: string; blocks: Block[] }> = [
    { table: 'editions', slug: 'zuccaland-2026', blocks: zuccalandEditionBlocks(z) },
    { table: 'series', slug: 'zuccaland', blocks: zuccalandOffseasonBlocks(z) },
    { table: 'editions', slug: 'assaggia-e-passeggia-2026', blocks: assaggiaEditionBlocks(ap) },
    { table: 'series', slug: 'assaggia-e-passeggia', blocks: assaggiaOffseasonBlocks(gallery as Array<{ src: string }>) },
  ];

  await db.query('begin');
  for (const t of targets) {
    const blocks = PageBlocksSchema.parse(t.blocks); // stessa validazione dell'editor
    const [row] = (await db.query<{ n: number }>(`select jsonb_array_length(page_blocks) as n from ${t.table} where slug = $1 for update`, [t.slug])).rows;
    if (!row) {
      console.log(`- ${t.table}/${t.slug}: non esiste, saltato`);
      continue;
    }
    if (row.n > 0 && !overwrite) {
      console.log(`- ${t.table}/${t.slug}: ha già ${row.n} blocchi, saltato (usa --sovrascrivi)`);
      continue;
    }
    await db.query(`update ${t.table} set page_blocks = $2::jsonb, updated_at = now() where slug = $1`, [t.slug, JSON.stringify(blocks)]);
    console.log(`✓ ${t.table}/${t.slug}: ${blocks.length} blocchi (${blocks.map((b) => b.type).join(', ')})`);
  }
  await db.query(write ? 'commit' : 'rollback');
  console.log(write ? 'Scritto.' : 'Prova: nulla è stato scritto. Rilancia con --conferma.');
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
