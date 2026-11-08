import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resultMac } from '@/server/integrations/nexi/mac';

const confirm = vi.fn(async (_codTrans: string) => 'https://x/ok');
const logError = vi.fn();
vi.mock('@/lib/tickets/legacyPayment', () => ({ confirmLegacyPayment: (c: string) => confirm(c) }));
vi.mock('@/server/log', () => ({ log: { error: (...a: unknown[]) => logError(...a) } }));

const KEY = 'dummy-key';
vi.stubEnv('NEXI_MAC_KEY', KEY);
const { POST } = await import('./route');

const fields = { codTrans: 'ORD123', esito: 'OK', importo: '100', divisa: 'EUR', data: '20260101', orario: '120000', codAut: 'X' };
const post = (body: Record<string, string>) => POST(new Request('http://local/api/nexi/notifica', { method: 'POST', body: new URLSearchParams(body), headers: { 'content-type': 'application/x-www-form-urlencoded' } }));

describe('POST /api/nexi/notifica (Nexi urlpost, classic checkout)', () => {
  beforeEach(() => {
    confirm.mockClear();
    logError.mockClear();
  });

  it('confirms a paid order even though the customer never came back', async () => {
    const res = await post({ ...fields, mac: resultMac(fields, KEY) });
    expect(res.status).toBe(200);
    expect(confirm).toHaveBeenCalledWith('ORD123');
  });

  it('rejects a wrong signature, confirms nothing and raises an alert with the order code only', async () => {
    const res = await post({ ...fields, mac: 'x' });
    expect(res.status).toBe(400);
    expect(confirm).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('firma non valida'), { source: 'server', codTrans: 'ORD123' });
  });

  it('does not mark a failed or cancelled payment as paid', async () => {
    const failed = { ...fields, esito: 'KO' };
    const res = await post({ ...failed, mac: resultMac(failed, KEY) });
    expect(res.status).toBe(200);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('answers 500 when processing fails, so Nexi retries', async () => {
    confirm.mockRejectedValueOnce(new Error('db down'));
    const res = await post({ ...fields, mac: resultMac(fields, KEY) });
    expect(res.status).toBe(500);
  });
});
