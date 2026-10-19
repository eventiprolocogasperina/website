// Chiamate dello scanner verso /api/scanner/*. Un timeout breve: se la rete non risponde entro
// pochi secondi lo scanner passa al controllo offline invece di lasciare la fila ferma.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
/** Errore di rete o timeout: si può ripiegare sull'elenco offline. */
export class NetworkError extends Error {}

export async function api<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 4000);
  let res: Response;
  try {
    res = await fetch(`/api/scanner/${path}`, {
      method: init.method ?? 'GET',
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError('Connessione assente.');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status === 401 ? 'Sessione scaduta: rientra con il PIN.' : (data.error ?? 'Richiesta non riuscita.'), res.status);
  return data as T;
}

export const qs = (params: Record<string, string | null | undefined>) =>
  new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
