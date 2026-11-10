// Mappa del sistema su un Postgres vero: un allarme recente e un'email fallita colorano i nodi giusti.
import { afterAll, describe, expect, it } from 'vitest';
import { alertThrottle, emailLog } from '@/server/db/schema';
import { closeTestDb, getDb } from '@/test/pg-client';

const { systemMap } = await import('./systemMap');

describe('mappa del sistema', () => {
  afterAll(closeTestDb);

  it('rosso sui nodi con errori recenti, il resto non cambia', async () => {
    const now = new Date();
    await getDb().insert(alertThrottle).values({ key: 'Nexi: firma non valida, pagamento non confermato', lastSentAt: now, suppressed: 2 });
    await getDb().insert(emailLog).values({ recipientMasked: 'm***@example.com', subject: 'Biglietti', status: 'failed' });
    const nodes = await systemMap(now);
    const node = (id: string) => nodes.find((n) => n.id === id)!;
    expect(node('pagamenti').level).toBe('error');
    expect(node('pagamenti').errors[0]).toMatchObject({ message: 'Nexi: firma non valida, pagamento non confermato', more: 2 });
    expect(node('email').level).toBe('error');
    expect(node('database').level).toBe('ok');
    expect(node('cassa').level).toBe('ok');
    expect(nodes.some((n) => n.id === 'altro')).toBe(false);
  });
});
