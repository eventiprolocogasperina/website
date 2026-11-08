import { beforeEach, describe, expect, it, vi } from 'vitest';

const markPaid = vi.fn();
const getOrder = vi.fn();
const sendEmail = vi.fn();
const telegram = vi.fn();
vi.mock('server-only', () => ({}));
vi.mock('@/lib/data/tickets', () => ({ markOrderPaidByCodTrans: (c: string) => markPaid(c), getOrder: (id: string) => getOrder(id) }));
vi.mock('@/lib/tickets/sendTicketsEmail', () => ({ sendTicketsEmail: (o: unknown) => sendEmail(o) }));
vi.mock('@/lib/telegram', () => ({ sendTelegramNotification: (m: string) => telegram(m) }));

const { confirmLegacyPayment } = await import('./legacyPayment');
const order = { id: 'ORD123', totalAmount: 20, notes: '', tickets: [{ type: 'Adulto', eventId: 'zuccaland-2026' }] };

describe('confirmLegacyPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrder.mockResolvedValue(order);
  });

  it('sends the tickets and the message once: the first confirmation only', async () => {
    markPaid.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await confirmLegacyPayment('ORD123'); // e.g. Nexi's server notification
    await confirmLegacyPayment('ORD123'); // then the browser return (or a page reload)
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(telegram).toHaveBeenCalledTimes(1);
  });

  it('still sends the customer to the success page when the order was already paid', async () => {
    markPaid.mockResolvedValue(false);
    expect(await confirmLegacyPayment('ORD123')).toContain('/zuccaland/success?order=ORD123');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not add an integration twice (parent note already carries the transaction)', async () => {
    markPaid.mockResolvedValue(false);
    getOrder.mockImplementation(async (id: string) =>
      id === 'ORD123'
        ? { ...order, notes: '[INTEGRAZIONE_PARENT:PARENT1]' }
        : { id: 'PARENT1', totalAmount: 40, notes: 'x | [INTEGRAZIONE NEXI PAGATA]: +€20.00 - Transazione: ORD123', tickets: order.tickets });
    vi.stubEnv('POSTGRES_URL', 'postgres://never-used');
    const url = await confirmLegacyPayment('ORD123');
    expect(url).toContain('order=PARENT1&integration=true');
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
