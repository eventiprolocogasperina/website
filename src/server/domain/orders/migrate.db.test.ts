// Migrazione degli ordini di oggi (prompt 10) su un Postgres vero: i QR già emessi restano validi,
// i numeri delle viste di confronto coincidono e una seconda esecuzione non crea nulla.
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scan } from '@/server/domain/checkin';
import { migrateOrders, reconciliation } from '../../../../scripts/lib/migrate-orders-core';
import { createEdition, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb } from '@/test/pg-client';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('migrazione degli ordini esistenti', () => {
  let db: Client;
  let f: Fixture;
  const legacyEvent = 'zuccaland-test';

  beforeAll(async () => {
    db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await db.connect();
    f = await createEdition({ status: 'concluded' });
    await db.query(`insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ('legacy_event_id', $1, $2), ('zuccaland_day', $3, $4)`, [legacyEvent, f.edition.id, `${legacyEvent}:24`, f.day1.id]);
    await db.query(
      `insert into orders (id, "buyerName", "buyerEmail", "buyerPhone", "totalAmount", status, notes, "createdAt", "paidAt") values
        ('ord_paid', 'Anna Bianchi', 'anna@example.com', null, 8.00, 'PAID', 'Data: Sabato 24 Ottobre 2026 | Bambini: 1/2 | nota libera', now() - interval '3 days', now() - interval '3 days'),
        ('ord_open', 'Luca Verdi', 'luca@example.com', null, 5.00, 'PENDING', 'Data: Sabato 24 Ottobre 2026', now() - interval '2 days', null)`,
    );
    await db.query(
      `insert into tickets (id, "orderId", "eventId", type, price, "qrCodeData", "isCheckedIn") values
        ('t1', 'ord_paid', $1, 'Ingresso', 5.00, 'QR-GIA-EMESSO-1', false),
        ('t2', 'ord_paid', $1, 'Laboratorio', 3.00, 'QR-GIA-EMESSO-2', true),
        ('t3', 'ord_open', $1, 'Ingresso', 5.00, 'QR-MAI-PAGATO', false)`,
      [legacyEvent],
    );
  });
  afterAll(async () => {
    await db.end();
    await closeTestDb();
  });

  it('copia ordini e biglietti, con i numeri che coincidono', async () => {
    const report = await migrateOrders(db, { edition: f.slug });
    expect(report.counts['ordini online']).toEqual({ created: 2, existing: 0 });
    expect(report.uninterpretedNotes).toEqual([{ orderId: 'ord_paid', edition: f.slug, text: 'nota libera' }]);
    const recon = await reconciliation(db, f.slug);
    expect(recon.online).toMatchObject({ ordini_vecchi: '2', ordini_nuovi: '2', biglietti_vecchi: '3', biglietti_nuovi: '3', incasso_vecchio_cents: '800', incasso_nuovo_cents: '800', checkin_vecchi: '1', checkin_nuovi: '1' });
  });

  it('un QR già emesso è valido nello scanner nuovo; uno non pagato no', async () => {
    const gate = roleOn('gate', f.slug);
    expect(await scan(gate, { qrToken: 'QR-GIA-EMESSO-1', checkinListId: f.entrance.id })).toMatchObject({ result: 'valid', ticket: { sessionLabel: 'Sab 24 ott' } });
    expect((await scan(gate, { qrToken: 'QR-MAI-PAGATO', checkinListId: f.entrance.id })).result).toBe('void');
  });

  it('si può rilanciare: non crea niente due volte', async () => {
    const again = await migrateOrders(db, { edition: f.slug });
    expect(again.counts['ordini online']).toEqual({ created: 0, existing: 2 });
  });

  it('aggancia le richieste di rimborso ai codici biglietto abbreviati o al "#" dell\'ordine', async () => {
    const g = await createEdition({ status: 'concluded' });
    await db.query(`insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ('legacy_event_id', 'rimborsi-test', $1)`, [g.edition.id]);
    await db.query(`insert into orders (id, "buyerName", "buyerEmail", "totalAmount", status) values ('ab12cd34ef56gh78', 'A', 'a@example.com', 8, 'PAID'), ('zz99yy88xx77ww66', 'B', 'b@example.com', 5, 'PAID')`);
    await db.query(
      `insert into tickets (id, "orderId", "eventId", type, price, "qrCodeData") values
        ('1a2b3c4d-5e6f-7a8b-9c0d-000000000001', 'ab12cd34ef56gh78', 'rimborsi-test', 'Ingresso', 5, 'QR-R1'),
        ('9f8e7d6c-5b4a-3f2e-1d0c-000000000002', 'ab12cd34ef56gh78', 'rimborsi-test', 'Laboratorio', 3, 'QR-R2'),
        ('77777777-6666-5555-4444-000000000003', 'zz99yy88xx77ww66', 'rimborsi-test', 'Ingresso', 5, 'QR-R3')`,
    );
    await db.query(
      `insert into refund_requests (id, full_name, email, booking_numbers, status) values
        ('rr_ticket', 'A', 'a@example.com', ' 1A2B3C4D-5E6F-7A, ', 'pending'),
        ('rr_order', 'B', 'b@example.com', '#ZZ99YY88', 'pending')`,
    );
    const report = await migrateOrders(db, { edition: g.slug });
    expect(report.counts['rimborsi']).toEqual({ created: 2, existing: 0 });
    const rows = (await db.query<{ legacy_id: string; amount_cents: number }>(
      `select m.legacy_id, r.amount_cents from refunds_v2 r join legacy_id_map m on m.new_id = r.id and m.legacy_kind = 'refund_request' order by m.legacy_id`,
    )).rows;
    expect(rows).toEqual([{ legacy_id: 'rr_order', amount_cents: 500 }, { legacy_id: 'rr_ticket', amount_cents: 500 }]);
  });

  it('con pendingOnSite un ordine in sospeso diventa "da pagare in loco", senza scadenza', async () => {
    const g = await createEdition({ status: 'concluded' });
    await db.query(`insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ('legacy_event_id', 'in-loco-test', $1)`, [g.edition.id]);
    await db.query(`insert into orders (id, "buyerName", "buyerEmail", "totalAmount", status, "createdAt") values ('ord_in_loco', 'C', 'c@example.com', 5, 'PENDING', now() - interval '2 days')`);
    await db.query(`insert into tickets (id, "orderId", "eventId", type, price, "qrCodeData") values ('t_in_loco', 'ord_in_loco', 'in-loco-test', 'Ingresso', 5, 'QR-IN-LOCO')`);
    await migrateOrders(db, { edition: g.slug, pendingOnSite: true });
    const [o] = (await db.query(`select o.status, o.pay_on_site, o.expires_at from orders_v2 o join legacy_id_map m on m.new_id = o.id and m.legacy_kind = 'order' where m.legacy_id = 'ord_in_loco'`)).rows;
    expect(o).toMatchObject({ status: 'pending', pay_on_site: true, expires_at: null });
  });

  it('salta le edizioni non concluse, se non richiesto', async () => {
    const active = await createEdition();
    await db.query(`insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ('legacy_event_id', 'attiva', $1)`, [active.edition.id]);
    await db.query(`insert into orders (id, "buyerName", "buyerEmail", "totalAmount", status) values ('ord_active', 'X', 'x@example.com', 5, 'PAID')`);
    await db.query(`insert into tickets (id, "orderId", "eventId", type, price, "qrCodeData") values ('t_active', 'ord_active', 'attiva', 'Ingresso', 5, 'QR-ATTIVA')`);
    expect((await migrateOrders(db, { edition: active.slug })).counts['ordini online']).toBeUndefined();
    expect((await migrateOrders(db, { edition: active.slug, includeActive: true })).counts['ordini online']).toEqual({ created: 1, existing: 0 });
  });
});
