/**
 * Backfill del prompt 08: crea format, edizioni, date, prodotti e quote a partire dai dati attuali
 * (tabella events, pages_content['zuccaland'], configurazione della cassa). Non modifica né cancella
 * nulla delle tabelle vecchie, e si può rilanciare: crea solo ciò che manca (legacy_id_map).
 *
 *   npm run backfill:editions                 # prova: mostra il report e annulla tutto
 *   npm run backfill:editions -- --conferma   # scrive davvero
 *
 * Usa POSTGRES_URL da .env.local. In produzione si lancia solo con il consenso di Niccolo, dopo aver
 * letto il report della prova (§18.4).
 */
import { config } from 'dotenv';
import { Client } from 'pg';
import { DEFAULT_CASHIER_CONFIG, type CashierConfig } from '../src/lib/data/cashier';
import type { ZuccalandContent } from '../src/lib/data/pages';
import { romeDateKey } from '../src/lib/dates';
import { planBackfill, type LegacyEventRow, type LegacyRef } from '../src/server/domain/editions/backfill';

config({ path: '.env.local', quiet: true });

const write = process.argv.includes('--conferma');

type Counter = { created: number; existing: number };
const counters: Record<string, Counter> = {};
const count = (what: string, created: boolean) => {
  counters[what] ??= { created: 0, existing: 0 };
  counters[what][created ? 'created' : 'existing']++;
};

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante in .env.local');
  const host = new URL(url).host;
  const db = new Client({ connectionString: url });
  await db.connect();

  const events = (
    await db.query<LegacyEventRow>(
      `select id, slug, title, date, time, location, image, "maxParticipants", price, bookable, "isFree" from events order by date`,
    )
  ).rows;
  const pages = (await db.query<{ slug: string; content: unknown }>(`select slug, content from pages_content where slug in ('zuccaland', 'cashier_config')`)).rows;
  const zuccaland = (pages.find((p) => p.slug === 'zuccaland')?.content as ZuccalandContent | undefined) ?? null;
  const savedCashier = pages.find((p) => p.slug === 'cashier_config')?.content as CashierConfig | undefined;
  const cashier = savedCashier ?? DEFAULT_CASHIER_CONFIG;
  const plan = planBackfill({ events, zuccaland, cashier, today: romeDateKey(new Date()) });
  if (!savedCashier) plan.notes.push('Nessuna configurazione della cassa salvata: si usa quella predefinita del codice, come fa oggi la cassa.');

  const lookup = async (refs: LegacyRef[]): Promise<string | null> => {
    for (const r of refs) {
      const { rows } = await db.query<{ new_id: string }>('select new_id from legacy_id_map where legacy_kind = $1 and legacy_id = $2', [r.kind, r.id]);
      if (rows[0]) return rows[0].new_id;
    }
    return null;
  };
  const remember = async (refs: LegacyRef[], id: string) => {
    for (const r of refs) await db.query('insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ($1, $2, $3) on conflict do nothing', [r.kind, r.id, id]);
  };

  await db.query('begin');
  try {
    const seriesIds = new Map<string, string>();
    for (const s of plan.series) {
      const found = await db.query<{ id: string }>('select id from series where slug = $1', [s.slug]);
      if (found.rows[0]) {
        seriesIds.set(s.slug, found.rows[0].id);
        count('format', false);
        continue;
      }
      const { rows } = await db.query<{ id: string }>(
        'insert into series (slug, name, description, landing_path, theme) values ($1, $2, $3, $4, $5) returning id',
        [s.slug, s.name, s.description, s.landingPath, JSON.stringify(s.theme)],
      );
      seriesIds.set(s.slug, rows[0].id);
      count('format', true);
    }

    const editionIds = new Map<string, string>();
    for (const e of plan.editions) {
      let id = await lookup(e.legacy);
      if (!id) id = (await db.query<{ id: string }>('select id from editions where slug = $1', [e.slug])).rows[0]?.id ?? null;
      if (id) count('edizioni', false);
      else {
        const { rows } = await db.query<{ id: string }>(
          `insert into editions (series_id, slug, year, title, status, starts_at, ends_at, location, cover_image, public_page_mode, enabled_modules)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
          [e.seriesSlug ? seriesIds.get(e.seriesSlug) : null, e.slug, e.year, e.title, e.status, e.startsAt, e.endsAt, e.location, e.coverImage, e.publicPageMode, e.enabledModules],
        );
        id = rows[0].id;
        count('edizioni', true);
      }
      editionIds.set(e.slug, id);
      await remember(e.legacy, id);
    }

    for (const s of plan.sessions) {
      if (await lookup([s.legacy])) {
        count('date', false);
        continue;
      }
      const { rows } = await db.query<{ id: string }>(
        'insert into sessions (edition_id, label, starts_at, ends_at, capacity, status, sort) values ($1, $2, $3, $4, $5, $6, $7) returning id',
        [editionIds.get(s.edition), s.label, s.startsAt, s.endsAt, s.capacity, s.status, s.sort],
      );
      await remember([s.legacy], rows[0].id);
      count('date', true);
    }

    // Rinvii: la data rinviata punta alla sua data di recupero. Si applica anche a date già create
    // da un backfill precedente (prima del prompt 11 il 10 e l'11 ottobre erano solo "chiuse").
    for (const s of plan.sessions) {
      if (!s.rescheduledTo) continue;
      const [from, to] = [await lookup([s.legacy]), await lookup([s.rescheduledTo])];
      if (!from || !to) continue;
      const { rowCount } = await db.query(
        `update sessions set status = 'postponed', rescheduled_to_session_id = $2, updated_at = now() where id = $1 and rescheduled_to_session_id is distinct from $2`,
        [from, to],
      );
      count('rinvii collegati', !!rowCount);
    }

    for (const p of plan.products) {
      if (await lookup([p.legacy])) {
        count('prodotti', false);
        continue;
      }
      const { rows } = await db.query<{ id: string }>(
        `insert into products (edition_id, kind, name, description, icon, price_cents, channels, requires_session, issues_ticket, department, active, sort)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
        [editionIds.get(p.edition), p.kind, p.name, p.description, p.icon, p.priceCents, p.channels, p.requiresSession, p.issuesTicket, p.department, p.active, p.sort],
      );
      await remember([p.legacy], rows[0].id);
      count('prodotti', true);
    }

    for (const q of plan.quotas) {
      if (await lookup([q.legacy])) {
        count('quote', false);
        continue;
      }
      const { rows } = await db.query<{ id: string }>('insert into quotas (edition_id, name, size) values ($1, $2, $3) returning id', [editionIds.get(q.edition), q.name, q.size]);
      for (const ref of q.products) {
        const productId = await lookup([ref]);
        if (productId) await db.query('insert into quota_products (quota_id, product_id) values ($1, $2) on conflict do nothing', [rows[0].id, productId]);
      }
      await remember([q.legacy], rows[0].id);
      count('quote', true);
    }

    // Casse della nuova cassa (prompt 14): una riga per cassa della vecchia configurazione.
    for (const r of plan.registers) {
      if (await lookup([r.legacy])) {
        count('casse', false);
        continue;
      }
      const productIds: string[] = [];
      for (const ref of r.products ?? []) {
        const id = await lookup([ref]);
        if (id) productIds.push(id);
      }
      const { rows } = await db.query<{ id: string }>(
        `insert into cash_registers (edition_id, name, product_ids, printer_settings, issues_numbers, sort)
         values ($1, $2, $3, $4, $5, $6) on conflict (edition_id, name) do update set updated_at = cash_registers.updated_at returning id`,
        [editionIds.get(r.edition), r.name, r.products ? productIds : null, r.printer ? JSON.stringify(r.printer) : null, r.issuesNumbers, r.sort],
      );
      await remember([r.legacy], rows[0].id);
      count('casse', true);
    }

    // Impostazioni iniziali dei moduli: solo se l'edizione non le ha già (mai sovrascrivere quelle scelte in admin).
    const resolveRefs = async (v: unknown): Promise<unknown> => {
      // In sequenza: una sola connessione, una query alla volta.
      if (Array.isArray(v)) {
        const out = [];
        for (const x of v) out.push(await resolveRefs(x));
        return out.filter((x) => x !== undefined);
      }
      if (v && typeof v === 'object') {
        if ('$ref' in v) return (await lookup([(v as { $ref: LegacyRef }).$ref])) ?? undefined;
        const out: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v)) out[k] = (await resolveRefs(x)) ?? null;
        return out;
      }
      return v;
    };
    for (const m of plan.moduleSettings) {
      const { rowCount } = await db.query(
        `update editions set module_settings = module_settings || jsonb_build_object($2::text, $3::jsonb), updated_at = now() where slug = $1 and not (module_settings ? $2)`,
        [m.edition, m.module, JSON.stringify(await resolveRefs(m.settings))],
      );
      count('impostazioni dei moduli', !!rowCount);
    }

    // Confronto dei prezzi di Zuccaland: pagina attuale contro catalogo nuovo.
    const priceCheck = zuccaland
      ? await Promise.all(
          (zuccaland.ticketTypes ?? []).map(async (t) => {
            const id = await lookup([{ kind: 'ticket_type', id: `zuccaland-2026:${t.id}` }]);
            const row = id ? (await db.query<{ name: string; price_cents: number }>('select name, price_cents from products where id = $1', [id])).rows[0] : undefined;
            return { type: t.label, page: Math.round(Number(t.price) * 100), catalog: row?.price_cents ?? null };
          }),
        )
      : [];

    printReport(host, plan, priceCheck);
    if (write) {
      await db.query('commit');
      console.log('\n✔ Scritto nel database.');
    } else {
      await db.query('rollback');
      console.log('\nProva: nulla è stato scritto. Per scrivere davvero rilancia con --conferma.');
    }
  } catch (error) {
    await db.query('rollback');
    throw error;
  } finally {
    await db.end();
  }
}

function printReport(host: string, plan: ReturnType<typeof planBackfill>, priceCheck: Array<{ type: string; page: number; catalog: number | null }>) {
  const euro = (c: number | null) => (c === null ? '—' : `${(c / 100).toFixed(2).replace('.', ',')} €`);
  console.log(`# Backfill delle edizioni (${write ? 'scrittura' : 'prova'})\n\nDatabase: ${host}\n`);
  console.log('| Cosa | Create | Già presenti |\n|---|---:|---:|');
  for (const [what, c] of Object.entries(counters)) console.log(`| ${what} | ${c.created} | ${c.existing} |`);
  console.log('\n## Edizioni\n\n| Slug | Titolo | Format | Stato | Pagina |\n|---|---|---|---|---|');
  for (const e of plan.editions) console.log(`| ${e.slug} | ${e.title} | ${e.seriesSlug ?? '—'} | ${e.status} | ${e.publicPageMode} |`);
  if (priceCheck.length) {
    console.log('\n## Prezzi di Zuccaland 2026\n\n| Biglietto | Pagina attuale | Catalogo nuovo | Uguale |\n|---|---:|---:|:---:|');
    for (const p of priceCheck) console.log(`| ${p.type} | ${euro(p.page)} | ${euro(p.catalog)} | ${p.page === p.catalog ? '✔' : '✘'} |`);
  }
  console.log('\n## Righe ignorate\n');
  if (!plan.skipped.length) console.log('Nessuna.');
  for (const s of plan.skipped) console.log(`- ${s.source} ${s.id}: ${s.reason}`);
  console.log('\n## Da rivedere\n');
  if (!plan.notes.length) console.log('Niente.');
  for (const n of plan.notes) console.log(`- ${n}`);
}

main().catch((error) => {
  console.error('Backfill non riuscito:', error instanceof Error ? error.message : error);
  process.exit(1);
});
