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

  it('salta le edizioni non concluse, se non richiesto', async () => {
    const active = await createEdition();
    await db.query(`insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ('legacy_event_id', 'attiva', $1)`, [active.edition.id]);
    await db.query(`insert into orders (id, "buyerName", "buyerEmail", "totalAmount", status) values ('ord_active', 'X', 'x@example.com', 5, 'PAID')`);
    await db.query(`insert into tickets (id, "orderId", "eventId", type, price, "qrCodeData") values ('t_active', 'ord_active', 'attiva', 'Ingresso', 5, 'QR-ATTIVA')`);
    expect((await migrateOrders(db, { edition: active.slug })).counts['ordini online']).toBeUndefined();
    expect((await migrateOrders(db, { edition: active.slug, includeActive: true })).counts['ordini online']).toEqual({ created: 1, existing: 0 });
  });
});
