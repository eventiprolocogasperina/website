// Misura delle pagine ordini con dati generati (prompt 12): 2.000 ordini nell'edizione, 8.000 in
// un'altra. Gira solo con PERF=1 (ci mette ~10 s a preparare i dati):
//   PERF=1 TEST_DATABASE_URL=… npx vitest run --project db src/server/domain/orders/admin-perf.db.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from '@/lib/admin/order-filters';
import { createEdition, owner, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { sql } from 'drizzle-orm';
import { exportOrders } from './admin-context';
import { getOrderDetail } from './admin-detail';
import { listOrders, orderViewCounts } from './admin-list';
import { listAttendees } from './attendees';

const enabled = !!process.env.TEST_DATABASE_URL && process.env.PERF === '1';

async function seed(f: Fixture, n: number, prefix: string) {
  await getDb().execute(sql`
    with c as (
      insert into customers (email, name, phone)
      select ${prefix} || i || '@example.com', 'Cliente ' || ${prefix} || ' ' || i, '+39 333 ' || lpad(i::text, 7, '0') from generate_series(1, ${n}) i
      on conflict (email) do update set name = excluded.name returning id, email
    ), o as (
      insert into orders_v2 (code, edition_id, customer_id, session_id, channel, status, subtotal_cents, total_cents, access_token, created_at, paid_at)
      select upper(${prefix}) || '-' || lpad(row_number() over ()::text, 6, '0'), ${f.edition.id}::uuid, c.id, ${f.day2.id}::uuid,
             (array['online','pos','admin','paylink'])[1 + (row_number() over ()) % 4]::order_channel,
             (array['paid','paid','paid','pending','refunded','expired'])[1 + (row_number() over ()) % 6]::order_status,
             1000, 1000, md5(random()::text) || md5(random()::text), now() - (random() * interval '60 days'), now()
      from c returning id
    ), l as (
      insert into order_lines (order_id, product_id, session_id, quantity, unit_price_cents, total_cents)
      select o.id, ${f.ticket.id}::uuid, ${f.day2.id}::uuid, 2, 500, 1000 from o returning id, order_id
    )
    insert into tickets_v2 (order_id, order_line_id, edition_id, product_id, session_id, qr_token)
    select l.order_id, l.id, ${f.edition.id}::uuid, ${f.ticket.id}::uuid, ${f.day2.id}::uuid, md5(random()::text) || k from l, generate_series(1, 2) k
  `);
  await getDb().execute(sql`analyze orders_v2; analyze customers; analyze tickets_v2; analyze order_lines`);
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  await fn(); // prima chiamata: piani e cache calde, come una pagina già aperta
  const t = performance.now();
  const out = await fn();
  const ms = performance.now() - t;
  process.stderr.write(`PERF ${label.padEnd(40)} ${ms.toFixed(1)} ms\n`);
  expect(ms).toBeLessThan(1000);
  return out;
}

describe.skipIf(!enabled)('prestazioni elenco ordini', () => {
  let f: Fixture;
  beforeAll(async () => {
    f = await createEdition();
    const other = await createEdition();
    await seed(f, 2000, `p${f.slug.slice(5)}`);
    await seed(other, 8000, `q${other.slug.slice(5)}`);
  }, 120_000);
  afterAll(closeTestDb);

  it('elenco, viste, ricerca, dettaglio e partecipanti sotto il secondo', async () => {
    const page = await timed('listOrders edizione (pagina 1)', () => listOrders(owner, f.slug, EMPTY_FILTERS));
    expect(page.total).toBe(2000);
    await timed('listOrders edizione (pagina 40)', () => listOrders(owner, f.slug, { ...EMPTY_FILTERS, page: 39 }));
    await timed('listOrders globale (10.000+)', () => listOrders(owner, null, EMPTY_FILTERS));
    await timed('listOrders ricerca "cliente p 19"', () => listOrders(owner, f.slug, { ...EMPTY_FILTERS, q: '19' }));
    await timed('listOrders stato+canale+totale', () => listOrders(owner, f.slug, { ...EMPTY_FILTERS, status: ['paid'], channel: ['online', 'pos'], sort: '-totale' }));
    await timed('orderViewCounts edizione', () => orderViewCounts(owner, f.slug));
    await timed('getOrderDetail', () => getOrderDetail(owner, page.rows[0].code, f.slug));
    await timed('listAttendees (pagina 1)', () => listAttendees(owner, f.slug, { q: '', session: '', checkin: '', page: 0 }));
    const rows = await timed('exportOrders (2.000 righe CSV)', () => exportOrders(owner, f.slug, EMPTY_FILTERS));
    expect(rows).toHaveLength(2000);
  }, 60_000);
});
