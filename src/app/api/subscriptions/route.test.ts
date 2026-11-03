import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: Array<Record<string, unknown>> = [];
let ip = '203.0.113.1';

vi.mock('@/server/email/resend', () => ({
  SafeResend: class {
    emails = { send: async (payload: Record<string, unknown>) => (sent.push(payload), { data: { id: 'x' }, error: null }) };
  },
}));
vi.mock('@/lib/generatePDF', () => ({ generateSubscriptionPDF: () => Buffer.from('pdf') }));
vi.mock('@/server/auth/context', () => ({ requestIp: async () => ip }));

const { POST } = await import('./route');

const valid = {
  nome: 'Maria', cognome: 'Rossi', luogoNascita: 'Catanzaro', provNascita: 'CZ', dataNascita: '1990-05-01',
  residenza: 'Gasperina', provResidenza: 'CZ', cap: '88060', indirizzo: 'Via Roma', civico: '1',
  codiceFiscale: 'RSSMRA90E41C352X', cellulare: '3330000000', email: 'maria@example.com',
  tipoSocio: 'ordinario', quotaSostenitore: '', statuto: true, privacy: true,
};
const post = (body: unknown) => POST(new Request('http://local/api/subscriptions', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/subscriptions', () => {
  beforeEach(() => {
    sent.length = 0;
    ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  });

  it('sends the two emails for a valid request', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(sent.map((s) => s.to)).toEqual(['iscrizioni@prolocogasperina.it', 'maria@example.com']);
  });

  it('rejects a list of recipients (audit lead 7: open mail relay)', async () => {
    const res = await post({ ...valid, email: ['a@example.test', 'b@example.test'] });
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it('escapes HTML typed into the form', async () => {
    await post({ ...valid, nome: '<a href="https://evil.example">Paga qui</a>' });
    const html = sent.map((s) => String(s.html)).join('');
    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
  });

  it('limits repeated requests from the same address', async () => {
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await post(valid)).status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });
});
