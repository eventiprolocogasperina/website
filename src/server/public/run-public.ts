import 'server-only';
import { requestIp } from '@/server/auth/context';
import { isRateLimited, recordFailure } from '@/server/auth/rateLimit';
import { isDomainError, type DomainErrorCode } from '@/server/domain/errors';
import { log } from '@/server/log';

export type PublicResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: DomainErrorCode };

/**
 * Corpo comune delle Server Action del sito pubblico: limite di richieste per IP, errori in italiano.
 * `limit` = quante chiamate per IP in 15 minuti (per azione).
 */
export async function runPublic<T>(name: string, limit: number, fn: (ip: string | null) => Promise<T>): Promise<PublicResult<T>> {
  const ip = await requestIp();
  const key = `public:${name}:${ip ?? 'sconosciuto'}`;
  if (isRateLimited(key, limit)) return { ok: false, code: 'RATE_LIMITED', error: 'Troppi tentativi. Aspetta qualche minuto e riprova.' };
  recordFailure(key);
  try {
    return { ok: true, data: await fn(ip) };
  } catch (error) {
    if (isDomainError(error)) return { ok: false, code: error.code, error: error.message };
    if (error && typeof error === 'object' && 'issues' in error) {
      const first = (error as { issues: Array<{ message: string }> }).issues[0];
      return { ok: false, code: 'VALIDATION', error: first?.message ?? 'Alcuni dati non sono validi.' };
    }
    log.error('Azione del sito pubblico non riuscita', { action: name, error });
    return { ok: false, code: 'INTERNAL', error: 'Si è verificato un errore. Riprova tra poco.' };
  }
}
