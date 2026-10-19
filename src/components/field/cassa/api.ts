// Indirizzi delle API della nuova cassa. Da un dispositivo abbinato l'edizione è quella del
// dispositivo; dall'admin (senza dispositivo) si passa `?edizione=`.

export type ApiFn = (path: string, params?: Record<string, string>) => string;

export function makeApi(adminEdition: string | null): ApiFn {
  return (path, params = {}) => {
    const q = new URLSearchParams(params);
    if (adminEdition) q.set('edizione', adminEdition);
    const s = q.toString();
    return `/api/cassa/${path}${s ? `?${s}` : ''}`;
  };
}

/** Chiave di idempotenza della vendita, generata sul telefono (§12.1 punto 7). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `pos-${crypto.randomUUID()}`;
  return `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
