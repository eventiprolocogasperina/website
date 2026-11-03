import { afterEach, describe, expect, it, vi } from 'vitest';
import { resultMac } from '@/server/integrations/nexi/mac';

vi.mock('@/lib/data/tickets', () => ({ markOrderPaidByCodTrans: vi.fn(), getOrder: vi.fn(async () => null) }));
vi.mock('@/lib/tickets/sendTicketsEmail', () => ({ sendTicketsEmail: vi.fn() }));
vi.mock('@/lib/telegram', () => ({ sendTelegramNotification: vi.fn() }));

const KEY = 'dummy-key';
vi.stubEnv('NEXI_MAC_KEY', KEY);
const { GET } = await import('./route');

const fields = { codTrans: 'ORD123', esito: 'OK', importo: '100', divisa: 'EUR', data: '20260101', orario: '120000', codAut: 'X' };
const call = (mac: string) => GET(new Request(`http://local/api/nexi/callback?${new URLSearchParams({ ...fields, mac })}`));

describe('GET /api/nexi/callback', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects a wrong MAC without logging the expected one (audit lead 1)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('x');
    expect(res.status).toBe(403);
    const logged = spy.mock.calls.flat().join(' ');
    expect(logged).not.toContain(resultMac(fields, KEY));
    expect(logged).toContain('ORD123');
  });

  it('accepts the correct MAC', async () => {
    const { markOrderPaidByCodTrans } = await import('@/lib/data/tickets');
    const res = await call(resultMac(fields, KEY));
    expect(res.status).not.toBe(403);
    expect(markOrderPaidByCodTrans).toHaveBeenCalledWith('ORD123');
  });
});
