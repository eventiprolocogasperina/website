// Ricrea il database e2e, applica le migrazioni e crea due edizioni di prova:
// - "e2e-zucche-2099": date con capienza (una esaurita), attività per bambini, laboratorio a pagamento, sconto E2E10;
// - "e2e-semplice-2099": nessun modulo, un biglietto senza data.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { E2E_DB, E2E_DB_NAME, sql } from './db';

export default async function setup() {
  const url = new URL(E2E_DB);
  if (url.hostname !== 'localhost' || url.pathname !== `/${E2E_DB_NAME}`) throw new Error('Database e2e non locale');
  const admin = new Client({ connectionString: E2E_DB.replace(`/${E2E_DB_NAME}`, '/postgres') });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${E2E_DB_NAME} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${E2E_DB_NAME}`);
  await admin.end();
  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  await migrate(drizzle(c), { migrationsFolder: 'drizzle' });
  await c.end();

  const [zucche] = await sql<{ id: string }>(
    `insert into editions (slug, year, title, status, starts_at, location, enabled_modules)
     values ('e2e-zucche-2099', 2099, 'Festa delle Zucche 2099', 'on_sale', '2099-10-17T13:00:00Z', 'Gasperina (CZ)', '{time-slots,activities,postponement}') returning id`,
  );
  const days = await sql<{ id: string; label: string }>(
    `insert into sessions (edition_id, label, starts_at, ends_at, capacity, sort) values
     ($1, 'Sab 17 ott 2099', '2099-10-17T13:00:00Z', '2099-10-17T18:00:00Z', 100, 1),
     ($1, 'Dom 18 ott 2099', '2099-10-18T13:00:00Z', '2099-10-18T18:00:00Z', 0, 2) returning id, label`,
    [zucche.id],
  );
  const [ticket, lab] = await sql<{ id: string }>(
    `insert into products (edition_id, kind, name, price_cents, channels, requires_session, issues_ticket, sort) values
     ($1, 'ticket', 'Ingresso', 500, '{online,pos}', true, true, 1),
     ($1, 'addon', 'Laboratorio zucca', 300, '{online}', true, true, 2) returning id`,
    [zucche.id],
  );
  void ticket;
  await sql(`update editions set module_settings = $2 where id = $1`, [
    zucche.id,
    JSON.stringify({
      activities: {
        askChildren: true,
        labProductId: lab.id,
        remindIfMissing: true,
        activities: [{ key: 'zucca_vaso', label: 'Zucca in Vaso', details: 'Dalle 15', target: 'bambini', sessionIds: [days[0].id], maxPlaces: 20 }],
      },
    }),
  ]);
  await sql(`insert into discounts_v2 (code, edition_id, kind, value) values ('E2E10', $1, 'percent', 10)`, [zucche.id]);

  const [semplice] = await sql<{ id: string }>(
    `insert into editions (slug, year, title, status, starts_at, location, enabled_modules)
     values ('e2e-semplice-2099', 2099, 'Concerto 2099', 'on_sale', '2099-12-20T19:00:00Z', 'Chiesa Madre', '{}') returning id`,
  );
  await sql(`insert into products (edition_id, kind, name, price_cents, channels, requires_session, issues_ticket) values ($1, 'ticket', 'Posto unico', 800, '{online}', false, true)`, [semplice.id]);
}
