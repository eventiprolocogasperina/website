/**
 * Migrazione degli ordini esistenti nel nucleo nuovo (prompt 10). Copia, non sposta: le tabelle
 * di oggi restano come sono. Si può rilanciare: le righe già migrate non vengono ricreate.
 *
 *   npm run migrate:orders                                   # prova: report e annulla tutto
 *   npm run migrate:orders -- --edizione zuccaland-2026      # una sola edizione
 *   npm run migrate:orders -- --conferma                     # scrive davvero
 *   npm run migrate:orders -- --anche-in-vendita             # solo in locale: anche edizioni non concluse
 *
 * Scrive il report di riconciliazione in docs/migrazione/<edizione>.md. Usa POSTGRES_URL da .env.local.
 * In produzione solo con il consenso di Niccolo, dopo aver letto il report della prova (§18.4).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { config } from 'dotenv';
import { Client } from 'pg';
import { migrateOrders, reconciliation, type MigrationReport, type ReconRow } from './lib/migrate-orders-core';

config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const write = args.includes('--conferma');
const includeActive = args.includes('--anche-in-vendita');
const editionArg = args.includes('--edizione') ? args[args.indexOf('--edizione') + 1] : null;

const euro = (cents: number) => (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

function table(title: string, row: ReconRow | null, pairs: Array<[string, string, string, boolean?]>) {
  if (!row) return '';
  const lines = [`### ${title}`, '', '| Voce | Vecchio | Nuovo | Differenza |', '|---|---:|---:|---:|'];
  for (const [label, oldKey, newKey, money] of pairs) {
    const a = Number(row[oldKey]);
    const b = Number(row[newKey]);
    const f = (n: number) => (money ? euro(n) : String(n));
    lines.push(`| ${label} | ${f(a)} | ${f(b)} | ${b - a === 0 ? '0' : `**${money ? euro(b - a) : b - a}**`} |`);
  }
  return lines.join('\n') + '\n';
}

function editionReport(slug: string, recon: Awaited<ReturnType<typeof reconciliation>>, report: MigrationReport, mode: string) {
  const mine = <T extends { edition: string }>(list: T[]) => list.filter((x) => x.edition === slug);
  const parts = [
    `# Migrazione ordini: ${slug}`,
    '',
    `${mode} del ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}. I numeri vengono dalle viste \`legacy_vs_v2_*\`: si possono ricontrollare in qualsiasi momento con \`select * from legacy_vs_v2_online where edizione = '${slug}'\`.`,
    '',
    table('Ordini online', recon.online, [
      ['Ordini', 'ordini_vecchi', 'ordini_nuovi'],
      ['Ordini pagati', 'pagati_vecchi', 'pagati_nuovi'],
      ['Biglietti', 'biglietti_vecchi', 'biglietti_nuovi'],
      ['Incasso online', 'incasso_vecchio_cents', 'incasso_nuovo_cents', true],
      ['Check-in', 'checkin_vecchi', 'checkin_nuovi'],
    ]),
    table('Cassa', recon.pos, [
      ['Ordini', 'ordini_vecchi', 'ordini_nuovi'],
      ['Annullati', 'annullati_vecchi', 'annullati_nuovi'],
      ['Contanti', 'contanti_vecchi_cents', 'contanti_nuovi_cents', true],
      ['POS', 'pos_vecchi_cents', 'pos_nuovi_cents', true],
      ['Omaggi', 'omaggi_vecchi', 'omaggi_nuovi'],
    ]),
    table('Prenotazioni gratuite', recon.bookings, [
      ['Prenotazioni', 'prenotazioni_vecchie', 'prenotazioni_nuove'],
      ['Confermate', 'confermate_vecchie', 'confermate_nuove'],
      ['Persone', 'persone_vecchie', 'persone_nuove'],
      ['Check-in', 'checkin_vecchi', 'checkin_nuovi'],
    ]),
  ];
  const anomalies = mine(report.anomalies);
  parts.push('## Da sapere', '', anomalies.length ? anomalies.map((a) => `- \`${a.id}\`: ${a.text}`).join('\n') : 'Niente da segnalare.', '');
  const created = mine(report.createdProducts);
  if (created.length) parts.push('## Prodotti creati spenti', '', 'Articoli venduti in passato che non sono più nel listino: creati non in vendita per poter collegare le righe.', '', ...created.map((p) => `- ${p.name}`), '');
  const notes = mine(report.uninterpretedNotes);
  parts.push('## Note non interpretate', '', notes.length ? ['| Ordine | Testo |', '|---|---|', ...notes.map((n) => `| \`${n.orderId}\` | ${n.text.replace(/\|/g, '\\|')} |`)].join('\n') : 'Nessuna: tutte le note sono state lette.', '');
  parts.push('Il testo originale di ogni nota resta in `orders_v2.legacy_notes`.', '');
  return parts.join('\n');
}

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante in .env.local');
  const db = new Client({ connectionString: url });
  await db.connect();
  console.log(`Database: ${new URL(url).host} · ${write ? 'SCRITTURA' : 'prova (nessuna modifica)'}${editionArg ? ` · edizione ${editionArg}` : ''}`);
  await db.query('begin');
  try {
    const report = await migrateOrders(db, { edition: editionArg, includeActive });
    mkdirSync('docs/migrazione', { recursive: true });
    for (const slug of report.editions) {
      const recon = await reconciliation(db, slug);
      writeFileSync(`docs/migrazione/${slug}.md`, editionReport(slug, recon, report, write ? 'Migrazione' : 'Prova'));
    }
    writeFileSync(
      'docs/migrazione/saltati.md',
      ['# Righe non migrate', '', report.skipped.length ? ['| Cosa | ID | Motivo |', '|---|---|---|', ...report.skipped.map((s) => `| ${s.what} | \`${s.id}\` | ${s.reason} |`)].join('\n') : 'Nessuna.', ''].join('\n'),
    );
    console.log('\nCreati / già presenti:');
    for (const [what, c] of Object.entries(report.counts)) console.log(`  ${what}: ${c.created} / ${c.existing}`);
    if (report.skipped.length) {
      console.log(`\nSaltati (${report.skipped.length}):`);
      for (const s of report.skipped) console.log(`  ${s.what} ${s.id}: ${s.reason}`);
    }
    console.log(`\nReport: ${report.editions.map((s) => `docs/migrazione/${s}.md`).join(', ') || 'nessuna edizione migrata'}`);
    if (!includeActive) console.log('Edizioni non concluse escluse (usa --anche-in-vendita solo in locale).');
    await db.query(write ? 'commit' : 'rollback');
    console.log(write ? '\nFatto.' : '\nProva finita: niente è stato scritto. Per scrivere: -- --conferma');
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
