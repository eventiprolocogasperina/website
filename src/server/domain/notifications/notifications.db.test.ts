// Notifiche, modelli email, impostazioni, allarmi e WhatsApp su un Postgres vero (prompt 18).
// Telegram e WhatsApp hanno un client finto: nessuna chiamata esce dai test.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { alertThrottle, editions, emailLog, users, whatsappMessages } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { buyer, createEdition, key, owner, roleOn, system, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';

const { setTelegramClient } = await import('@/server/integrations/telegram');
const { setWhatsappClient } = await import('@/server/integrations/whatsapp');
const { createOrder } = await import('@/server/domain/orders');
const { recordPayment } = await import('@/server/domain/payments');
const { saveEditionNotifications } = await import('./settings');
const { answerCommand } = await import('./bot');
const { eveningSummaries } = await import('./reports');
const { getSettings, saveSettings } = await import('@/server/domain/settings');
const { resolveTemplate, saveTemplate, resetTemplate } = await import('@/server/domain/email-templates');
const { reportError, resetAlertMemory } = await import('@/server/alerts');
const { applyWhatsappStatuses, previewWhatsappBroadcast, sendWhatsappBroadcast } = await import('@/modules/broadcast/whatsapp');
const real = await vi.importActual<typeof import('@/server/email/order-tickets')>('@/server/email/order-tickets');
const { deliverEmail } = await import('@/server/email/send');

const telegram = vi.fn(async (_chat: string, _text: string) => true);
setTelegramClient({ sendMessage: telegram });
const enabled = !!process.env.TEST_DATABASE_URL;
const texts = () => telegram.mock.calls.map((c) => c[1]);

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'nessun errore';
}

describe.skipIf(!enabled)('notifiche e sistema', () => {
  let f: Fixture;
  const line = () => [{ productId: f.ticket.id, quantity: 2, sessionId: f.day2.id }];
  const paidOrder = () => createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: line(), customer: buyer, idempotencyKey: key(), payNow: 'cash' });

  beforeAll(async () => {
    f = await createEdition();
  });
  beforeEach(() => telegram.mockClear());
  afterAll(async () => {
    setTelegramClient(null);
    setWhatsappClient(null);
    await closeTestDb();
  });

  it('Telegram: nuovo ordine con codice e importo, mai nome o email', async () => {
    const o = await paidOrder();
    const msg = texts().find((t) => t.includes('Nuovo ordine'));
    expect(msg).toContain(o.code);
    expect(msg).toMatch(/10,00\s€/);
    expect(texts().join('\n')).not.toMatch(/mario|rossi|example\.com|333/i);
  });

  it('Telegram: data quasi piena ed esaurita, una volta sola', async () => {
    const e = await createEdition();
    const sell = (quantity: number) => createOrder(owner, { editionId: e.edition.id, channel: 'admin', lines: [{ productId: e.ticket.id, quantity, sessionId: e.day1.id }], customer: buyer, idempotencyKey: key(), payNow: 'cash' });
    await sell(1);
    expect(texts().some((t) => t.includes('quasi piena'))).toBe(false);
    await sell(1);
    expect(texts().filter((t) => t.includes('Tutto esaurito') && t.includes('Sab 24 ott'))).toHaveLength(1);
    expect(texts().some((t) => t.includes('quasi piena'))).toBe(false);
  });

  it('bot: /oggi e /stato senza dati personali', async () => {
    await paidOrder();
    const oggi = await answerCommand({ cmd: '/oggi', arg: f.slug });
    expect(oggi).toContain('Oggi ·');
    expect(oggi).toMatch(/Online: <b>\d+<\/b> ordini/);
    expect(oggi).not.toMatch(/mario|rossi|example\.com|333/i);
    const stato = await answerCommand({ cmd: '/stato', arg: '' });
    expect(stato).toContain('Database');
    expect(stato).toContain('Configurazione');
    expect((await eveningSummaries()).join('\n')).not.toMatch(/mario|rossi|example\.com/i);
  });

  it('Telegram: pagamento non riuscito', async () => {
    const o = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: line(), customer: buyer, idempotencyKey: key() });
    await recordPayment(system, { orderId: o.id, method: 'nexi', amountCents: o.totalCents, status: 'failed', providerRef: `nexi:${key()}` });
    expect(texts().some((t) => t.includes('Pagamento non riuscito') && t.includes(o.code))).toBe(true);
  });

  it('un tipo spento per l’edizione non manda nulla; edizione archiviata e permessi', async () => {
    await saveEditionNotifications(owner, { edition: f.slug, settings: { orderPaid: false, paymentProblem: true, refundRequested: true, cashDifference: true, capacity: true, dailySummary: true } });
    await paidOrder();
    expect(texts().some((t) => t.includes('Nuovo ordine'))).toBe(false);
    await saveEditionNotifications(owner, { edition: f.slug, settings: { orderPaid: true, paymentProblem: true, refundRequested: true, cashDifference: true, capacity: true, dailySummary: true } });
    expect(await errorCode(saveEditionNotifications(roleOn('cashier', f.slug), { edition: f.slug, settings: { orderPaid: true, paymentProblem: true, refundRequested: true, cashDifference: true, capacity: true, dailySummary: true } }))).toBe('FORBIDDEN');
    const a = await createEdition({ status: 'archived' });
    expect(await errorCode(saveEditionNotifications(owner, { edition: a.slug, settings: { orderPaid: false, paymentProblem: true, refundRequested: true, cashDifference: true, capacity: true, dailySummary: true } }))).toBe('EDITION_ARCHIVED');
  });

  it('modello conferma: il testo salvato in admin arriva nell’email, senza deploy', async () => {
    expect((await resolveTemplate('confirmation', f.edition.id)).source).toBe('default');
    await saveTemplate(owner, { key: 'confirmation', edition: null, subject: 'Eccoci {{ordine.codice}}', body: 'Testo globale per {{cliente.nome}}.' });
    await saveTemplate(owner, { key: 'confirmation', edition: f.slug, subject: 'Edizione {{ordine.codice}}', body: 'Testo **speciale** per {{cliente.nome}}.' });
    expect((await resolveTemplate('confirmation', f.edition.id)).source).toBe('edition');
    const o = await paidOrder();
    vi.mocked(deliverEmail).mockClear();
    expect(await real.sendOrderTickets(o.id, { reason: 'resent' })).toBe(true);
    const sent = vi.mocked(deliverEmail).mock.calls[0][0];
    expect(sent.subject).toBe(`Edizione ${o.code}`);
    expect(sent.html).toContain('Testo <strong>speciale</strong> per Mario.');
    const [row] = await getDb().select().from(emailLog).where(eq(emailLog.orderId, o.id));
    expect(row).toMatchObject({ templateKey: 'confirmation', status: 'sent', providerId: 'test', recipientMasked: 'm***@example.com' });
    await resetTemplate(owner, { key: 'confirmation', edition: f.slug });
    expect((await resolveTemplate('confirmation', f.edition.id)).source).toBe('global');
    expect(await errorCode(saveTemplate(owner, { key: 'confirmation', edition: null, subject: 'Ok ok', body: 'Il tuo IBAN {{cliente.iban}}' }).catch((e) => Promise.reject(e.name === 'ZodError' ? new DomainError('VALIDATION') : e)))).toBe('VALIDATION');
    expect(await errorCode(saveTemplate(roleOn('editor', null), { key: 'confirmation', edition: null, subject: 'Ciao', body: 'Testo di prova.' }))).toBe('FORBIDDEN');
  });

  it('impostazioni: salvataggio, default e permessi', async () => {
    await saveSettings(owner, 'telegram', { telegram_alert_chat_id: '-100123', telegram_allowed_chats: [{ id: '42', label: 'Direttivo' }] });
    expect(await getSettings('telegram')).toEqual({ telegram_alert_chat_id: '-100123', telegram_allowed_chats: [{ id: '42', label: 'Direttivo' }] });
    expect((await getSettings('general')).whatsapp_topics).toEqual([]);
    expect(await errorCode(saveSettings(roleOn('cashier', f.slug), 'telegram', {}))).toBe('FORBIDDEN');
  });

  it('allarmi: al massimo uno ogni 10 minuti per tipo, con il conto dei raggruppati', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'finto';
    resetAlertMemory();
    const t0 = new Date('2026-10-20T10:00:00Z');
    expect(await reportError('Errore di prova', { code: 'X1' }, t0)).toBe(true);
    expect(await reportError('Errore di prova', { code: 'X1' }, new Date(t0.getTime() + 60_000))).toBe(false);
    resetAlertMemory(); // un'altra istanza: decide la tabella
    expect(await reportError('Errore di prova', { code: 'X1' }, new Date(t0.getTime() + 120_000))).toBe(false);
    expect(await reportError('Errore di prova', { code: 'X1' }, new Date(t0.getTime() + 11 * 60_000))).toBe(true);
    expect(telegram).toHaveBeenCalledTimes(2);
    expect(telegram.mock.calls[1][1]).toContain('+2 dello stesso tipo');
    const [row] = await getDb().select().from(alertThrottle).where(eq(alertThrottle.key, 'Errore di prova'));
    expect(row.suppressed).toBe(0);
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it('WhatsApp: anteprima, invio idempotente, segmento cambiato, stati dal webhook', async () => {
    await saveSettings(owner, 'whatsapp', { wa_phone_number_id: '123456', whatsapp_templates: [{ name: 'avviso', language: 'it', body: 'Ciao {{1}}, ordine {{2}}', params: ['cliente.nome', 'ordine.codice'] }] });
    process.env.WHATSAPP_ACCESS_TOKEN = 'finto';
    let n = 0;
    const send = vi.fn(async () => ({ ok: true as const, id: `wamid.${++n}` }));
    setWhatsappClient({ sendTemplate: send });
    const g = await createEdition();
    // Il segmento contiene dati personali: serve un utente dell'admin, non un contesto senza utente.
    const [u] = await getDb().insert(users).values({ name: 'Staff', email: `staff-${key()}@example.org` }).returning();
    const staff = { ...owner, user: { id: u.id, name: u.name, email: u.email } };
    await createOrder(owner, { editionId: g.edition.id, channel: 'admin', lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }], customer: buyer, idempotencyKey: key(), payNow: 'cash' });
    await createOrder(owner, { editionId: g.edition.id, channel: 'admin', lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }], customer: { ...buyer, email: 'altro@example.com', phone: null }, idempotencyKey: key(), payNow: 'cash' });
    const segment = { editionId: g.edition.id, checkedIn: 'any' as const, templateName: 'avviso' };
    const p = await previewWhatsappBroadcast(staff, segment);
    expect(p).toMatchObject({ recipients: 1, withoutPhone: 1, text: 'Ciao Maria, ordine ZK26-7F3K' });
    expect(await errorCode(sendWhatsappBroadcast(staff, { ...segment, requestId: crypto.randomUUID(), expectedRecipients: 2 }))).toBe('CONFLICT');
    const requestId = crypto.randomUUID();
    const [a, b] = await Promise.all([sendWhatsappBroadcast(staff, { ...segment, requestId, expectedRecipients: 1 }), sendWhatsappBroadcast(staff, { ...segment, requestId, expectedRecipients: 1 })]);
    expect(send).toHaveBeenCalledTimes(1);
    expect([a.duplicate, b.duplicate].sort()).toEqual([false, true]);
    expect(send.mock.calls[0]).toEqual([expect.objectContaining({ to: '393331234567', template: 'avviso', params: ['Mario', expect.stringMatching(/-/)] })]);
    const id = 'wamid.1';
    await applyWhatsappStatuses({ entry: [{ changes: [{ value: { statuses: [{ id, status: 'read' }] } }] }] });
    await applyWhatsappStatuses({ entry: [{ changes: [{ value: { statuses: [{ id, status: 'delivered' }] } }] }] });
    const [m] = await getDb().select().from(whatsappMessages).where(eq(whatsappMessages.waMessageId, id));
    expect(m).toMatchObject({ status: 'read', phoneMasked: '***567' });
    expect(await errorCode(previewWhatsappBroadcast({ ...roleOn('cashier', g.slug), user: staff.user }, segment))).toBe('FORBIDDEN');
    await getDb().update(editions).set({ status: 'archived' }).where(eq(editions.id, g.edition.id));
    expect(await errorCode(sendWhatsappBroadcast(staff, { ...segment, requestId: crypto.randomUUID(), expectedRecipients: 1 }))).toBe('EDITION_ARCHIVED');
    delete process.env.WHATSAPP_ACCESS_TOKEN;
  });
});
