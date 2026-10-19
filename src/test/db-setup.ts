// Eseguito prima di ogni file *.db.test.ts: client `pg` al posto di Neon e una chiave di test per gli IBAN.
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => import('./pg-client'));

process.env.REFUND_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString('base64');

// Le righe di log degli eventi di dominio non servono nell'output dei test.
vi.spyOn(console, 'log').mockImplementation(() => {});
