// Moduli su un Postgres vero (prompt 11): interruttori e impostazioni, funzioni che senza modulo non
// esistono, e i servizi dei moduli (inviti, pay-link, rinvio in blocco, destinatari dei messaggi).
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLog, editions, ordersV2, products, ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { saveModuleSettings, setModuleEnabled } from '@/server/domain/editions/modules';
import { createOrder, moveSession } from '@/server/domain/orders';
import { scan } from '@/server/domain/checkin';
import { buyer, createEdition, ctxWith, key, owner, roleOn, system } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { broadcastAudience } from './broadcast/server';
import { sendInvites } from './invites/server';
import { createPaylinkOrder } from './paylink/server';
import { moveAllOrders } from './postponement/server';

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; text: string }>);
vi.mock('@/server/email/send', async (orig) => ({
  ...(await orig<typeof import('@/server/email/send')>()),
  sendEmail: async (e: { to: string; subject: string; text: string }) => (sent.push(e), true),
}));

const enabled = !!process.env.TEST_DATABASE_URL;
const errorCode = (p: Promise<unknown>) => p.then(() => null, (e) => (e instanceof DomainError ? e.code : String(e)));
const errorMessage = (p: Promise<unknown>) => p.then(() => null, (e: Error) => e.message);
const staff = { ...ctxWith([{ role: 'owner', edition: null }]), user: { id: '00000000-0000-4000-8000-000000000001', name: 'Test', email: null } };

describe.skipIf(!enabled)('moduli', () => {
  beforeEach(() => void sent.splice(0));
  afterAll(() => closeTestDb());

  describe('interruttori e impostazioni', () => {
    it('rispetta le dipendenze e non cancella le impostazioni quando si spegne', async () => {
      const f = await createEdition({ modules: [] });
      expect(await errorMessage(setModuleEnabled(owner, f.slug, { module: 'postponement', enabled: true }))).toMatch(/Attiva prima: Fasce orarie/);
      await setModuleEnabled(owner, f.slug, { module: 'time-slots', enabled: true });
      await setModuleEnabled(owner, f.slug, { module: 'postponement', enabled: true });
      expect(await errorMessage(setModuleEnabled(owner, f.slug, { module: 'time-slots', enabled: false }))).toMatch(/Serve a: Rinvio/);

      await saveModuleSettings(owner, f.slug, { module: 'time-slots', settings: { showRemaining: false, lowThreshold: 5, closeMinutesBefore: 30 } });
      await setModuleEnabled(owner, f.slug, { module: 'postponement', enabled: false });
      await setModuleEnabled(owner, f.slug, { module: 'time-slots', enabled: false });
      const [row] = await getDb().select().from(editions).where(eq(editions.id, f.edition.id));
      expect(row.enabledModules).toEqual([]);
      expect(row.moduleSettings).toEqual({ 'time-slots': { showRemaining: false, lowThreshold: 5, closeMinutesBefore: 30 } });

      const audits = await getDb().select().from(auditLog).where(eq(auditLog.entityId, f.edition.id));
      expect(audits.map((a) => a.action).sort()).toEqual(
        ['edition.module_disabled', 'edition.module_disabled', 'edition.module_enabled', 'edition.module_enabled', 'edition.module_settings_saved'].sort(),
      );
    });

    it('valida le impostazioni con lo schema del modulo e controlla il permesso', async () => {
      const f = await createEdition();
      expect(await errorCode(saveModuleSettings(owner, f.slug, { module: 'paylink', settings: { validityHours: 0 } }))).toBe('VALIDATION');
      expect(await errorCode(saveModuleSettings(owner, f.slug, { module: 'inesistente', settings: {} }))).toMatch(/Modulo sconosciuto/);
      expect(await errorCode(setModuleEnabled(roleOn('cashier', f.slug), f.slug, { module: 'invites', enabled: false }))).toBe('FORBIDDEN');
      expect(await errorCode(setModuleEnabled(roleOn('event_manager', f.slug), f.slug, { module: 'invites', enabled: false }))).toBeNull();
    });

    it('un’edizione archiviata non cambia', async () => {
      const f = await createEdition({ status: 'archived' });
      expect(await errorCode(setModuleEnabled(owner, f.slug, { module: 'reviews', enabled: false }))).toBe('EDITION_ARCHIVED');
    });
  });

  describe('senza modulo la funzione non esiste', () => {
    it('inviti, pay-link e cambio data sono rifiutati su un’edizione senza moduli', async () => {
      const f = await createEdition({ modules: [] });
      const line = [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }];
      expect(await errorMessage(createOrder(owner, { editionId: f.edition.id, channel: 'invite', lines: line, customer: buyer, idempotencyKey: key() }))).toMatch(/Inviti/);
      expect(await errorMessage(createPaylinkOrder(owner, { editionId: f.edition.id, lines: line, customer: buyer, idempotencyKey: key() }))).toMatch(/Pagamento con link/);
      const paid = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: line, customer: buyer, idempotencyKey: key(), payNow: 'cash' });
      expect(await errorMessage(moveSession(owner, { orderId: paid.id, toSessionId: f.day1.id }))).toMatch(/Rinvio/);
      expect(await errorMessage(broadcastAudience(staff, { editionId: f.edition.id }))).toMatch(/Messaggi/);
    });
  });

  describe('inviti', () => {
    it('crea un ordine a 0 € per invitato, rispetta il massimo e non duplica se rilanciato', async () => {
      const f = await createEdition();
      await saveModuleSettings(owner, f.slug, { module: 'invites', settings: { maxPerRecipient: 2, message: '' } });
      const input = {
        editionId: f.edition.id,
        productId: f.ticket.id,
        sessionId: f.day2.id,
        batchKey: 'invio-prova-1',
        recipients: [
          { name: 'Sindaco', email: 'Sindaco@Example.com', quantity: 2 },
          { name: 'Troppi', email: 'troppi@example.com', quantity: 3 },
        ],
      };
      const first = await sendInvites(owner, input);
      expect(first[0]).toMatchObject({ ok: true, order: { status: 'paid', totalCents: 0, created: true } });
      expect(first[1]).toMatchObject({ ok: false, error: 'Al massimo 2 biglietti per invitato.' });
      const again = await sendInvites(owner, input);
      expect(again[0]).toMatchObject({ ok: true, order: { created: false } });
      const [o] = await getDb().select().from(ordersV2).where(and(eq(ordersV2.editionId, f.edition.id), eq(ordersV2.channel, 'invite')));
      expect(o.totalCents).toBe(0);
    });
  });

  describe('pay-link', () => {
    it('la scadenza viene dalle impostazioni del modulo', async () => {
      const f = await createEdition();
      await getDb().update(products).set({ channels: ['online', 'paylink'] }).where(eq(products.id, f.ticket.id));
      await saveModuleSettings(owner, f.slug, { module: 'paylink', settings: { validityHours: 6 } });
      const now = new Date();
      const r = await createPaylinkOrder(owner, { editionId: f.edition.id, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], customer: buyer, idempotencyKey: key() });
      expect(r.status).toBe('pending');
      expect(Math.round((r.expiresAt!.getTime() - now.getTime()) / 3_600_000)).toBe(6);
    });
  });

  describe('rinvio', () => {
    it('sposta tutti gli ordini che entrano, lascia gli altri, e manda l’email', async () => {
      const f = await createEdition();
      const buy = (qty: number, email: string) =>
        createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: [{ productId: f.ticket.id, quantity: qty, sessionId: f.day2.id }], customer: { ...buyer, email }, idempotencyKey: key(), payNow: 'cash' });
      const small = await buy(2, 'piccolo@example.com');
      const big = await buy(3, 'grande@example.com');
      const res = await moveAllOrders(owner, { editionId: f.edition.id, fromSessionId: f.day2.id, toSessionId: f.day1.id, reason: 'Pioggia' });
      expect(res.moved).toEqual([small.code]);
      expect(res.failed).toEqual([{ code: big.code, error: expect.stringMatching(/esauriti/) }]);
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ to: 'piccolo@example.com', subject: expect.stringContaining(small.code) });
      expect(sent[0].text).toContain('Sab 24 ott');
    });

    it('nessuna email se l’impostazione è spenta', async () => {
      const f = await createEdition();
      await saveModuleSettings(owner, f.slug, { module: 'postponement', settings: { notifyByEmail: false, allowCustomerChange: false } });
      const o = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], customer: buyer, idempotencyKey: key(), payNow: 'cash' });
      await moveSession(owner, { orderId: o.id, toSessionId: f.day1.id });
      expect(sent).toHaveLength(0);
    });
  });

  describe('messaggi', () => {
    it('filtra per data e per ingresso, solo per chi ha un utente e il permesso', async () => {
      const f = await createEdition();
      const buy = (email: string, sessionId: string) =>
        createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: [{ productId: f.ticket.id, quantity: 1, sessionId }], customer: { ...buyer, email }, idempotencyKey: key(), payNow: 'cash' });
      const a = await buy('a@example.com', f.day1.id);
      const b = await buy('b@example.com', f.day2.id);
      await createOrder(owner, { editionId: f.edition.id, channel: 'online', lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], customer: { ...buyer, email: 'non-pagato@example.com' }, idempotencyKey: key() });
      const [ticket] = await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, a.id));
      expect((await scan(roleOn('gate', f.slug), { qrToken: ticket.qrToken, checkinListId: f.entrance.id })).result).toBe('valid');

      const emails = async (input: object) => (await broadcastAudience(staff, { editionId: f.edition.id, ...input })).map((r) => r.email).sort();
      expect(await emails({})).toEqual(['a@example.com', 'b@example.com']);
      expect(await emails({ sessionId: f.day2.id })).toEqual(['b@example.com']);
      expect(await emails({ checkedIn: 'in' })).toEqual(['a@example.com']);
      expect(await emails({ checkedIn: 'out' })).toEqual(['b@example.com']);
      expect(b.status).toBe('paid');

      expect(await errorCode(broadcastAudience(owner, { editionId: f.edition.id }))).toBe('FORBIDDEN');
      expect(await errorCode(broadcastAudience(system, { editionId: f.edition.id }))).toBe('FORBIDDEN');
      expect(await errorCode(broadcastAudience({ ...staff, grants: [{ role: 'gate', edition: f.slug }] }, { editionId: f.edition.id }))).toBe('FORBIDDEN');
    });
  });
});
