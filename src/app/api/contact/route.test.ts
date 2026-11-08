import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: Array<Record<string, unknown>> = [];
let ip = '203.0.113.1';
let failSend = false;

vi.mock('@/server/email/resend', () => ({
  SafeResend: class {
    emails = { send: async (payload: Record<string, unknown>) => (failSend ? { data: null, error: { message: 'boom' } } : (sent.push(payload), { data: { id: 'x' }, error: null })) };
  },
}));
vi.mock('@/server/auth/context', () => ({ requestIp: async () => ip }));

const { POST } = await import('./route');

const valid = { nome: 'Maria', email: 'maria@example.com', oggetto: 'Sponsorizzazione', messaggio: 'Vorrei sostenere la sagra.', website: '' };
const post = (body: unknown) => POST(new Request('http://local/api/contact', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/contact', () => {
  beforeEach(() => {
    sent.length = 0;
    failSend = false;
    ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  });

  it('writes only to the association inbox, with the visitor as reply-to', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'prolocogasperina@gmail.com', replyTo: 'maria@example.com' });
  });

  it('escapes the message and rejects subjects outside the list', async () => {
    await post({ ...valid, messaggio: '<script>x</script>' });
    expect(String(sent[0].html)).not.toContain('<script>');
    expect((await post({ ...valid, oggetto: 'Ciao\r\nBcc: a@b.it' })).status).toBe(400);
  });

  it('drops bots (filled honeypot) and rate-limits an address', async () => {
    expect((await post({ ...valid, website: 'http://spam' })).status).toBe(400);
    expect(sent).toHaveLength(0);
    ip = '203.0.113.250';
    for (let i = 0; i < 3; i++) await post(valid);
    expect((await post(valid)).status).toBe(429);
  });

  it('says so when the email provider fails', async () => {
    failSend = true;
    expect((await post(valid)).status).toBe(502);
  });
});
