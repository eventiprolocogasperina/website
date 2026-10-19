// Test dello scanner (prompt 15) su un Postgres vero: date rinviate, due telefoni sullo stesso QR,
// blacklist, modalità offline idempotente, azioni dei moduli, statistiche, ricerca e liste.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { attendeeAnswers, auditLog, checkins, devices, editions, ordersV2, sessions, ticketsV2 } from '@/server/db/schema';
import { saveModuleSettings } from '@/server/domain/editions/modules';
import { DomainError } from '@/server/domain/errors';
import { createOrder } from '@/server/domain/orders';
import { anon, buyer, createEdition, key, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import {
  applyScannerAction,
  checkinStats,
  deleteCheckinList,
  listCheckinLists,
  listCounters,
  offlineManifest,
  qrHash,
  revertCheckin,
  saveCheckinList,
  scan,
  scannerV2Enabled,
  searchTickets,
  setScannerV2,
  syncOfflineCheckins,
} from './index';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'nessun errore';
}

describe.skipIf(!enabled)('scanner e liste di check-in', () => {
  let f: Fixture;
  let phoneA: Ctx;
  let phoneB: Ctx;

  async function device(name: string, slug: string): Promise<Ctx> {
    const [d] = await getDb().insert(devices).values({ name, tokenHash: randomUUID(), editionSlug: slug, kind: 'scanner' }).returning();
    return { ...roleOn('gate', slug), device: { id: d.id, name, edition: slug, kind: 'scanner' } };
  }
  async function order(g = f, sessionId = g.day2.id, quantity = 1, email = buyer.email) {
    const r = await createOrder(owner, { editionId: g.edition.id, channel: 'admin', payNow: 'cash', customer: { ...buyer, email }, idempotencyKey: key(), lines: [{ productId: g.ticket.id, quantity, sessionId }] });
    const tickets = await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, r.id));
    return { ...r, tickets };
  }

  beforeAll(async () => {
    f = await createEdition();
    phoneA = await device('Ingresso nord', f.slug);
    phoneB = await device('Ingresso sud', f.slug);
  });
  afterAll(async () => {
    await closeTestDb();
  });

  describe('scan', () => {
    it('stesso biglietto da due telefoni insieme: uno valido, l’altro già entrato con il nome del primo telefono', async () => {
      const { tickets } = await order();
      const [a, b] = await Promise.all([scan(phoneA, { qrToken: tickets[0].qrToken, checkinListId: f.entrance.id }), scan(phoneB, { qrToken: tickets[0].qrToken, checkinListId: f.entrance.id })]);
      expect([a.result, b.result].sort()).toEqual(['already_used', 'valid']);
      const used = a.result === 'already_used' ? a : b;
      const valid = a.result === 'valid' ? 'Ingresso nord' : 'Ingresso sud';
      expect(used).toMatchObject({ result: 'already_used', by: valid });
      const rows = await getDb().select().from(checkins).where(eq(checkins.ticketId, tickets[0].id));
      expect(rows).toHaveLength(1);
    });

    it('dieci letture contemporanee dello stesso QR: un solo ingresso', async () => {
      const { tickets } = await order();
      const results = await Promise.all(Array.from({ length: 10 }, (_, i) => scan(i % 2 ? phoneA : phoneB, { qrToken: tickets[0].qrToken, checkinListId: f.entrance.id })));
      expect(results.filter((r) => r.result === 'valid')).toHaveLength(1);
      expect(results.filter((r) => r.result === 'already_used')).toHaveLength(9);
    });

    it('altra data: wrong_session con la data in cui vale; la lista con una data vince su quella scelta', async () => {
      const { tickets } = await order(f, f.day2.id);
      const r = await scan(phoneA, { qrToken: tickets[0].qrToken, checkinListId: f.entrance.id, sessionId: f.day1.id });
      expect(r).toMatchObject({ result: 'wrong_session', ticket: { sessionLabel: 'Dom 25 ott', validOn: 'Dom 25 ott' } });
      const day1Only = await saveCheckinList(owner, f.slug, null, { name: 'Solo sabato', sessionId: f.day1.id });
      expect((await scan(phoneA, { qrToken: tickets[0].qrToken, checkinListId: day1Only.id, sessionId: f.day2.id })).result).toBe('wrong_session');
    });

    it('data rinviata: il biglietto della data rinviata entra alla data di recupero', async () => {
      const g = await createEdition();
      const gate = roleOn('gate', g.slug);
      const { tickets } = await order(g, g.day1.id);
      // Il rinvio sposta gli ordini (modulo postponement); qui il biglietto resta apposta sulla data rinviata.
      await getDb().update(sessions).set({ status: 'postponed', rescheduledToSessionId: g.day2.id }).where(eq(sessions.id, g.day1.id));
      const r = await scan(gate, { qrToken: tickets[0].qrToken, checkinListId: g.entrance.id, sessionId: g.day2.id });
      expect(r).toMatchObject({ result: 'valid', ticket: { sessionLabel: 'Sab 24 ott', validOn: 'Dom 25 ott' } });
      // Il contrario no: un biglietto della data di recupero non vale in un'altra data.
      const other = await order(g, g.day2.id);
      const [third] = await getDb().insert(sessions).values({ editionId: g.edition.id, label: 'Sab 31 ott', startsAt: new Date('2026-10-31T08:00:00Z') }).returning();
      expect((await scan(gate, { qrToken: other.tickets[0].qrToken, checkinListId: g.entrance.id, sessionId: third.id })).result).toBe('wrong_session');
      // Contatori: il biglietto rinviato conta tra gli attesi della data di recupero.
      expect(await listCounters(gate, g.entrance.id, g.day2.id)).toEqual({ entered: 1, expected: 2 });
    });

    it('ordine in blacklist: bloccato; ricerca per biglietto (ticketId) invece del QR', async () => {
      const { id, tickets } = await order();
      await getDb().update(ordersV2).set({ isBlacklisted: true }).where(eq(ordersV2.id, id));
      expect((await scan(phoneA, { ticketId: tickets[0].id, checkinListId: f.entrance.id })).result).toBe('blocked');
      const ok = await order();
      expect(await scan(phoneA, { ticketId: ok.tickets[0].id, checkinListId: f.entrance.id })).toMatchObject({ result: 'valid', ticket: { holderName: 'Mario Rossi', orderCode: ok.code } });
    });

    it('ingresso e annullo finiscono nel registro con il dispositivo', async () => {
      const { tickets } = await order();
      const r = await scan(phoneA, { qrToken: tickets[0].qrToken, checkinListId: f.entrance.id });
      if (r.result !== 'valid') throw new Error(r.result);
      await revertCheckin(phoneA, { checkinId: r.checkinId });
      const logs = await getDb().select().from(auditLog).where(eq(auditLog.entityId, tickets[0].id));
      expect(logs.map((l) => l.action).sort()).toEqual(['ticket.checked_in', 'ticket.checkin_reverted']);
      expect(logs.every((l) => l.actorDeviceId === phoneA.device!.id && l.actorLabel?.includes('Ingresso nord'))).toBe(true);
    });
  });

  describe('offline', () => {
    it('l’elenco contiene solo impronte, data e stato: niente dati personali né QR in chiaro', async () => {
      const g = await createEdition();
      const gate = roleOn('gate', g.slug);
      const a = await order(g, g.day1.id, 2, 'offline@example.com');
      await scan(gate, { qrToken: a.tickets[0].qrToken, checkinListId: g.entrance.id });
      const m = await offlineManifest(gate, g.entrance.id);
      const json = JSON.stringify(m);
      for (const secret of ['offline@example.com', 'Mario', a.code, a.tickets[0].qrToken]) expect(json).not.toContain(secret);
      const day1 = m.sessions.findIndex((s) => s.id === g.day1.id);
      expect(m.entries).toContainEqual([qrHash(a.tickets[0].qrToken), day1, 1]);
      expect(m.entries).toContainEqual([qrHash(a.tickets[1].qrToken), day1, 0]);
      expect(await errorCode(offlineManifest(roleOn('gate', f.slug), g.entrance.id))).toBe('FORBIDDEN');
    });

    it('la sincronizzazione è idempotente, anche con due invii insieme', async () => {
      const { tickets } = await order();
      const item = { clientId: `c-${randomUUID()}`, qrToken: tickets[0].qrToken, checkinListId: f.entrance.id, sessionId: f.day2.id, at: new Date(Date.now() - 60_000) };
      const [x, y] = await Promise.all([syncOfflineCheckins(phoneA, { items: [item] }), syncOfflineCheckins(phoneA, { items: [item] })]);
      expect([x[0].result, y[0].result]).toEqual(['valid', 'valid']);
      const again = await syncOfflineCheckins(phoneA, { items: [item] });
      expect(again[0].result).toBe('valid');
      const rows = await getDb().select().from(checkins).where(eq(checkins.ticketId, tickets[0].id));
      expect(rows).toHaveLength(1);
      expect(rows[0].at.getTime()).toBe(item.at.getTime());
    });

    it('un biglietto entrato nel frattempo da un altro telefono torna come già entrato; clientId riusato = errore', async () => {
      const { tickets } = await order();
      const other = await order();
      await scan(phoneB, { qrToken: tickets[0].qrToken, checkinListId: f.entrance.id });
      const clientId = `c-${randomUUID()}`;
      const out = await syncOfflineCheckins(phoneA, {
        items: [
          { clientId, qrToken: tickets[0].qrToken, checkinListId: f.entrance.id },
          { clientId: `c-${randomUUID()}`, qrToken: other.tickets[0].qrToken, checkinListId: f.entrance.id },
        ],
      });
      expect(out.map((o) => o.result)).toEqual(['already_used', 'valid']);
      expect(out[0].by).toBe('Ingresso sud');
      const third = await order();
      const reused = await syncOfflineCheckins(phoneA, { items: [{ clientId: out[1].clientId, qrToken: third.tickets[0].qrToken, checkinListId: f.entrance.id }] });
      expect(reused[0].result).toBe('error');
    });
  });

  describe('azioni dei moduli', () => {
    it('+1 Bambino crea o aggiorna la risposta, con registro; due telefoni insieme fanno +2', async () => {
      const { id } = await order();
      expect(await applyScannerAction(phoneA, { orderId: id, actionKey: 'counter-0' })).toEqual({ questionKey: 'bambini', label: '+1 Bambino', before: 0, after: 1 });
      await Promise.all([applyScannerAction(phoneA, { orderId: id, actionKey: 'counter-0' }), applyScannerAction(phoneB, { orderId: id, actionKey: 'counter-0' })]);
      const [answer] = await getDb().select().from(attendeeAnswers).where(and(eq(attendeeAnswers.orderId, id), eq(attendeeAnswers.questionKey, 'bambini')));
      expect(answer.value).toBe(3);
      const logs = await getDb().select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, 'order.scanner_action')));
      expect(logs).toHaveLength(3);
      expect(logs.some((l) => l.actorDeviceId === phoneB.device!.id)).toBe(true);
    });

    it('le risposte migrate ({ bambini, iscritti }) restano nel loro formato', async () => {
      const { id } = await order();
      await getDb().insert(attendeeAnswers).values({ orderId: id, questionKey: 'bambini', value: { bambini: 2, iscritti: 4 } });
      expect((await applyScannerAction(phoneA, { orderId: id, actionKey: 'counter-0' })).after).toBe(3);
      const [answer] = await getDb().select().from(attendeeAnswers).where(eq(attendeeAnswers.orderId, id));
      expect(answer.value).toEqual({ bambini: 3, iscritti: 4 });
    });

    it('rifiuta: modulo spento, ordine non pagato, sotto zero, altra edizione', async () => {
      const g = await createEdition();
      const gate = roleOn('gate', g.slug);
      const paid = await order(g);
      await saveModuleSettings(owner, g.slug, { module: 'activities', settings: { scannerCounters: [{ label: '−1 Bambino', questionKey: 'bambini', increment: -1 }] } });
      expect(await errorCode(applyScannerAction(gate, { orderId: paid.id, actionKey: 'counter-0' }))).toBe('VALIDATION');
      expect(await errorCode(applyScannerAction(phoneA, { orderId: paid.id, actionKey: 'counter-0' }))).toBe('FORBIDDEN');
      const pending = await createOrder(anon, { editionId: g.edition.id, channel: 'online', customer: buyer, idempotencyKey: key(), lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }] });
      expect(await errorCode(applyScannerAction(gate, { orderId: pending.id, actionKey: 'counter-0' }))).toBe('CONFLICT');
      await getDb().update(editions).set({ enabledModules: ['time-slots'] }).where(eq(editions.id, g.edition.id));
      expect(await errorCode(applyScannerAction(gate, { orderId: paid.id, actionKey: 'counter-0' }))).toBe('CONFLICT');
    });
  });

  describe('statistiche, ricerca, liste e flag', () => {
    it('entrati e attesi per data e per lista, ingressi per quarto d’ora e per dispositivo', async () => {
      const g = await createEdition();
      const gate = await device('Tablet', g.slug);
      const a = await order(g, g.day2.id, 3);
      await order(g, g.day1.id, 1);
      await scan(gate, { qrToken: a.tickets[0].qrToken, checkinListId: g.entrance.id }, { now: new Date('2026-10-25T09:01:00Z') });
      await scan(gate, { qrToken: a.tickets[1].qrToken, checkinListId: g.entrance.id }, { now: new Date('2026-10-25T09:14:00Z') });
      await scan(gate, { qrToken: a.tickets[2].qrToken, checkinListId: g.entrance.id }, { now: new Date('2026-10-25T09:46:00Z') });
      const s = await checkinStats(gate, g.slug, { now: new Date('2026-10-25T12:00:00Z') });
      expect(s.sessions.map((x) => [x.label, x.entered, x.expected])).toEqual([
        ['Sab 24 ott', 0, 1],
        ['Dom 25 ott', 3, 3],
      ]);
      expect(s.lists[0]).toMatchObject({ name: 'Ingresso', entered: 3, expected: 4 });
      expect(s.day).toBe('2026-10-25');
      expect(s.quarters.map((q) => q.count)).toEqual([2, 0, 0, 1]);
      expect(s.devices).toEqual([{ id: gate.device!.id, name: 'Tablet', count: 3 }]);
      expect(await errorCode(checkinStats(roleOn('cashier', g.slug), g.slug))).toBe('FORBIDDEN');
    });

    it('ricerca per nome o codice senza email né telefono', async () => {
      const g = await createEdition();
      const gate = roleOn('gate', g.slug);
      const a = await order(g, g.day2.id, 2, 'cerca@example.com');
      const byName = await searchTickets(gate, { checkinListId: g.entrance.id, q: 'rossi' });
      expect(byName).toHaveLength(1);
      expect(byName[0]).toMatchObject({ code: a.code, holderName: 'Mario Rossi', admitted: true });
      expect(byName[0].tickets).toHaveLength(2);
      expect(JSON.stringify(byName)).not.toContain('example.com');
      expect((await searchTickets(gate, { checkinListId: g.entrance.id, q: a.code.toLowerCase() }))[0].orderId).toBe(a.id);
      expect(await searchTickets(gate, { checkinListId: g.entrance.id, q: 'nessuno%' })).toEqual([]);
    });

    it('liste: prodotti dell’edizione, niente eliminazione con ingressi, permessi', async () => {
      const g = await createEdition();
      expect(await errorCode(saveCheckinList(owner, g.slug, null, { name: 'Estranea', productIds: [f.ticket.id] }))).toBe('VALIDATION');
      const lab = await saveCheckinList(owner, g.slug, null, { name: 'Laboratorio', productIds: [g.lab.id], allowMultiple: true });
      const lists = await listCheckinLists(roleOn('gate', g.slug), g.slug);
      expect(lists.map((l) => l.name)).toEqual(['Ingresso', 'Laboratorio']);
      const { tickets } = await order(g);
      await scan(roleOn('gate', g.slug), { qrToken: tickets[0].qrToken, checkinListId: g.entrance.id });
      expect(await errorCode(deleteCheckinList(owner, g.slug, g.entrance.id))).toBe('CONFLICT');
      expect(await errorCode(deleteCheckinList(roleOn('gate', g.slug), g.slug, lab.id))).toBe('FORBIDDEN');
      await deleteCheckinList(owner, g.slug, lab.id);
      expect((await listCheckinLists(owner, g.slug)).map((l) => l.name)).toEqual(['Ingresso']);
    });

    it('flag dello scanner nuovo: spento di default, lo cambia solo chi gestisce le impostazioni', async () => {
      expect(await scannerV2Enabled()).toBe(false);
      expect(await errorCode(setScannerV2(roleOn('event_manager', f.slug), true))).toBe('FORBIDDEN');
      await setScannerV2(owner, true);
      expect(await scannerV2Enabled()).toBe(true);
      await setScannerV2(owner, false);
      expect(await scannerV2Enabled()).toBe(false);
    });
  });
});
