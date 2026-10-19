// Eseguito prima di ogni file *.db.test.ts: client `pg` al posto di Neon e una chiave di test per gli IBAN.
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => import('./pg-client'));

process.env.REFUND_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');

// Le righe di log degli eventi di dominio non servono nell'output dei test.
vi.spyOn(console, 'log').mockImplementation(() => {});

// Nessuna email vera dai test: l'invio riesce senza uscire (i test che le controllano hanno il loro mock).
vi.mock('@/server/email/send', async (orig) => ({ ...(await orig<typeof import('@/server/email/send')>()), sendEmail: async () => true }));

// Email dei biglietti (PDF): i test controllano che parta, senza generare il PDF.
vi.mock('@/server/email/order-tickets', async (orig) => ({ ...(await orig<typeof import('@/server/email/order-tickets')>()), sendOrderTickets: vi.fn(async () => true) }));
