// Clienti, rimborsi, viste salvate, flag, partecipanti e messaggi dell'admin (prompt 12) su un Postgres vero.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { auditLog, customers, siteSettings, users } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { createOrder, type CreateOrderInput } from '@/server/domain/orders';
import { setOrderBlacklist } from '@/server/domain/orders/admin';
import { listAttendees, manifestFor } from '@/server/domain/orders/attendees';
import { createRefund, requestRefund } from '@/server/domain/refunds';
import { exportApprovedRefunds, listRefunds } from '@/server/domain/refunds/admin';
import { deleteView, listSavedViews, saveView } from '@/server/domain/views';
import { ordersV2Enabled, setOrdersV2Enabled } from '@/server/admin/flags';
import { sendMessageToOrders } from '@/modules/broadcast/messages';
import { anon, buyer, createEdition, key, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { getCustomer, listCustomers, mergeCustomers, updateCustomer } from './admin';

const enabled = !!process.env.TEST_DATABASE_URL;
const IBAN = 'IT60X0542811101000000123456';

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    if ((e as { name?: string }).name === 'ZodError') return 'ZOD';
    throw e;
  }
  return 'nessun errore';
}

async function userCtx(role: 'owner' | 'event_manager' = 'owner', edition: string | null = null): Promise<Ctx> {
  const [u] = await getDb().insert(users).values({ email: `${randomUUID()}@prova.local`, name: 'Prova' }).returning();
  return { user: { id: u.id, name: u.name, email: u.email }, device: null, legacy: false, grants: [{ role, edition }], ip: null };
}

describe.skipIf(!enabled)('admin clienti, rimborsi e viste sul database', () => {
  let f: Fixture;
  const order = (over: Partial<CreateOrderInput> = {}, fx = f) =>
    createOrder(owner, {
      editionId: fx.edition.id,
      channel: 'admin',
      customer: buyer,
      lines: [{ productId: fx.ticket.id, quantity: 1, sessionId: fx.day2.id }],
      idempotencyKey: key(),
      payNow: 'cash',
      ...over,
    });

  beforeAll(async () => {
    f = await createEdition();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  describe('clienti', () => {
    it('unisce due doppioni: lo storico passa al cliente buono, gli ordini non cambiano', async () => {
      const tag = randomUUID().slice(0, 6);
      const a = await order({ customer: { email: `giulia.${tag}@example.com`, name: 'Giulia Neri' } });
      const b = await order({ customer: { email: `g.neri.${tag}@example.com`, name: 'Giulia Neri', phone: '+39 320 5555555' } });
      const [target] = await getDb().select().from(customers).where(eq(customers.email, `giulia.${tag}@example.com`));
      const [source] = await getDb().select().from(customers).where(eq(customers.email, `g.neri.${tag}@example.com`));

      expect(await errorCode(mergeCustomers(roleOn('event_manager', f.slug), { sourceId: source.id, targetId: target.id, confirmEmail: source.email }))).toBe('FORBIDDEN');
      expect(await errorCode(mergeCustomers(owner, { sourceId: source.id, targetId: target.id, confirmEmail: 'altro@example.com' }))).toBe('VALIDATION');
      expect(await errorCode(mergeCustomers(owner, { sourceId: source.id, targetId: source.id, confirmEmail: source.email }))).toBe('VALIDATION');
      await mergeCustomers(owner, { sourceId: source.id, targetId: target.id, confirmEmail: source.email.toUpperCase() });
      expect(await errorCode(mergeCustomers(owner, { sourceId: source.id, targetId: target.id, confirmEmail: source.email }))).toBe('CONFLICT');

      const detail = await getCustomer(owner, target.id);
      expect(detail.customer.phone).toBe('+39 320 5555555');
      expect(detail.orders.map((o) => o.code).sort()).toEqual([a.code, b.code].sort());
      expect(detail.merged.map((m) => m.email)).toEqual([source.email]);
      expect(detail.paidCents).toBe(1000);

      const list = await listCustomers(owner, { q: tag, page: 0 });
      expect(list.rows.map((r) => r.id)).toEqual([target.id]);
      expect(list.rows[0]).toMatchObject({ orders: 2, paidCents: 1000 });

      // Catena: un terzo doppione unito al primo porta con sé anche quelli uniti a lui.
      const c = await order({ customer: { email: `third.${tag}@example.com`, name: 'Giulia' } });
      const [third] = await getDb().select().from(customers).where(eq(customers.email, `third.${tag}@example.com`));
      await mergeCustomers(owner, { sourceId: target.id, targetId: third.id, confirmEmail: target.email });
      const [movedSource] = await getDb().select().from(customers).where(eq(customers.id, source.id));
      expect(movedSource.mergedIntoId).toBe(third.id);
      expect((await getCustomer(owner, third.id)).orders.map((o) => o.code).sort()).toEqual([a.code, b.code, c.code].sort());
      const log = await getDb().select().from(auditLog).where(and(eq(auditLog.action, 'customer.merged'), eq(auditLog.entityId, target.id)));
      expect(log).toHaveLength(1);
    });

    it('modifica note e telefono, revoca il consenso; serve customers.read', async () => {
      const tag = randomUUID().slice(0, 6);
      await order({ customer: { email: `luca.${tag}@example.com`, name: 'Luca', marketingConsent: true } });
      const [c] = await getDb().select().from(customers).where(eq(customers.email, `luca.${tag}@example.com`));
      expect(await errorCode(listCustomers(roleOn('event_manager', f.slug), { q: '', page: 0 }))).toBe('FORBIDDEN');
      await updateCustomer(owner, { id: c.id, phone: '+39 348 1234567', notes: 'Preferisce il telefono', revokeConsent: true });
      const [after] = await getDb().select().from(customers).where(eq(customers.id, c.id));
      expect(after).toMatchObject({ phone: '+39 348 1234567', notes: 'Preferisce il telefono', marketingConsent: false, consentAt: null });
      expect(await errorCode(updateCustomer(owner, { id: c.id, phone: 'abc' }))).toBe('ZOD');
    });
  });

  describe('rimborsi', () => {
    it('coda con IBAN mascherato; il CSV ha l’IBAN intero solo per chi lo può vedere', async () => {
      const fx = await createEdition();
      const r = await order({}, fx);
      await requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, reason: 'Non vengo', iban: IBAN, holderName: 'Mario Rossi' });
      const queue = await listRefunds(owner, fx.slug, { status: '', channel: '', q: '', page: 0 });
      expect(queue.counts.requested).toBe(1);
      expect(queue.rows[0]).toMatchObject({ orderCode: r.code, status: 'requested', iban: 'IT60 •••• •••• 3456', holderName: 'Mario Rossi' });
      expect(JSON.stringify(queue)).not.toContain(IBAN);
      // Filtro per canale: l'ordine fatto dall'admin compare tra gli Admin, non tra Online né Cassa.
      expect(queue.rows[0].channel).toBe('admin');
      const ch = 'admin';
      expect((await listRefunds(owner, fx.slug, { status: '', channel: ch, q: '', page: 0 })).total).toBe(1);
      for (const other of (['online', 'cassa', 'admin'] as const).filter((c) => c !== ch)) {
        const res = await listRefunds(owner, fx.slug, { status: '', channel: other, q: '', page: 0 });
        expect(res.total).toBe(0);
        expect(res.counts.requested).toBe(0);
      }

      const r2 = await order({}, fx);
      await createRefund(owner, { orderId: r2.id, amountCents: 500, method: 'bank_transfer', reason: 'Annullato', iban: IBAN, holderName: 'Mario Rossi' });
      const full = await exportApprovedRefunds(owner, fx.slug);
      expect(full).toMatchObject({ fullIban: true });
      expect(full.rows.map((x) => x.ibanFull)).toEqual([IBAN]);
      const masked = await exportApprovedRefunds(roleOn('event_manager', fx.slug), fx.slug);
      expect(masked.fullIban).toBe(false);
      expect(masked.rows[0].ibanFull).toBeNull();
      const exported = await getDb().select().from(auditLog).where(and(eq(auditLog.action, 'refund.iban_exported'), eq(auditLog.editionSlug, fx.slug)));
      expect(exported).toHaveLength(1);
      expect(JSON.stringify(exported)).not.toContain(IBAN);
      expect(await errorCode(listRefunds(roleOn('event_manager', f.slug), fx.slug, { status: '', channel: '', q: '', page: 0 }))).toBe('FORBIDDEN');
    });
  });

  describe('viste salvate', () => {
    it('per utente, nomi unici, senza pagina; si cancellano solo le proprie', async () => {
      const me = await userCtx();
      const other = await userCtx();
      const v = await saveView(me, { scope: 'orders', name: 'Contanti in attesa', query: 'stato=pending&canale=pos&pagina=3' });
      expect(v.query).toBe('stato=pending&canale=pos');
      expect(await errorCode(saveView(me, { scope: 'orders', name: 'Contanti in attesa', query: '' }))).toBe('CONFLICT');
      expect(await errorCode(saveView(me, { scope: 'orders', name: 'Cattiva', query: '<script>' }))).toBe('ZOD');
      expect(await errorCode(saveView(owner, { scope: 'orders', name: 'Senza utente', query: '' }))).toBe('FORBIDDEN');
      expect(await listSavedViews(other, 'orders')).toEqual([]);
      expect(await errorCode(deleteView(other, v.id))).toBe('NOT_FOUND');
      await deleteView(me, v.id);
      expect(await listSavedViews(me, 'orders')).toEqual([]);
    });
  });

  describe('flag orders_v2', () => {
    it('spento di default, si accende solo con settings.manage', async () => {
      await getDb().delete(siteSettings).where(eq(siteSettings.key, 'orders_v2'));
      expect(await ordersV2Enabled()).toBe(false);
      expect(await errorCode(setOrdersV2Enabled(roleOn('event_manager', f.slug), true))).toBe('FORBIDDEN');
      await setOrdersV2Enabled(owner, true);
      const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.key, 'orders_v2'));
      expect(row.value).toBe('true');
      await setOrdersV2Enabled(owner, false);
    });
  });

  describe('partecipanti', () => {
    it('un biglietto per riga; il registro esclude la blacklist e raggruppa per data', async () => {
      const fx = await createEdition();
      const a = await order({ lines: [{ productId: fx.ticket.id, quantity: 2, sessionId: fx.day2.id }], answers: [{ questionKey: 'bambini', value: 1 }] }, fx);
      const b = await order({ customer: { email: 'zeta@example.com', name: 'Anna Zeta' }, lines: [{ productId: fx.ticket.id, quantity: 1, sessionId: fx.day1.id }] }, fx);
      const list = await listAttendees(owner, fx.slug, { q: '', session: '', checkin: '', page: 0 });
      expect(list.total).toBe(3);
      expect(list.rows.filter((r) => r.orderCode === a.code)[0].answers).toContain('Bambini 1');
      expect((await listAttendees(owner, fx.slug, { q: 'zeta', session: '', checkin: '', page: 0 })).total).toBe(1);
      expect((await listAttendees(owner, fx.slug, { q: '', session: fx.day1.id, checkin: 'in', page: 0 })).total).toBe(0);

      await setOrderBlacklist(owner, { orderId: b.id, blacklisted: true, reason: 'Prova' });
      const m = await manifestFor(owner, fx.slug, null);
      expect(m.layout).toBe('activities');
      expect(m.groups).toHaveLength(1);
      expect(m.groups[0].rows).toMatchObject([{ code: a.code, persons: 2, children: 1 }]);
      expect(await errorCode(manifestFor(roleOn('event_manager', f.slug), fx.slug, null))).toBe('FORBIDDEN');
    });
  });

  describe('messaggio ai clienti', () => {
    it('serve un utente con orders.edit e il modulo broadcast', async () => {
      const r = await order();
      expect(await errorCode(sendMessageToOrders(owner, { editionId: f.edition.id, orderIds: [r.id], subject: 'Parcheggio', body: 'Il parcheggio è in via Roma.' }))).toBe('FORBIDDEN');
      const noModule = await createEdition({ modules: ['time-slots'] });
      const o = await order({}, noModule);
      const me = await userCtx();
      expect(await errorCode(sendMessageToOrders(me, { editionId: noModule.edition.id, orderIds: [o.id], subject: 'Parcheggio', body: 'Il parcheggio è in via Roma.' }))).toBe('CONFLICT');
    });
  });
});
