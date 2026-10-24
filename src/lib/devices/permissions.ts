// Permessi dei dispositivi da campo (cassa e varco), scelti quando si genera il QR di abbinamento e
// modificabili dopo. Funzioni pure: le usano il server (validazione, contesto) e l'admin (caselle).
import { MATRIX, type Permission } from '@/server/auth/permissions';

export type DeviceKind = 'pos' | 'scanner';

type DevicePermissionInfo = { permission: Permission; label: string; help: string; required?: boolean };

/** Le caselle di ogni ruolo, nell'ordine in cui si mostrano. Solo queste chiavi si accettano. */
export const DEVICE_PERMISSIONS: Record<DeviceKind, readonly DevicePermissionInfo[]> = {
  pos: [
    { permission: 'pos.sell', label: 'Vendere', help: 'Sempre attivo: è il lavoro della cassa.', required: true },
    { permission: 'pos.open_amount', label: '«Altro» a importo libero', help: 'Solo se la cassa ha «Altro» acceso.' },
    { permission: 'pos.complimentary', label: 'Omaggi', help: 'Registrare un omaggio con il motivo.' },
    { permission: 'pos.void', label: 'Annullare vendite senza responsabile', help: 'Spento: per annullare serve il PIN di un responsabile.' },
    { permission: 'pos.open_close_session', label: 'Aprire e chiudere il turno', help: 'Fondo cassa, conteggio e chiusura Z.' },
    { permission: 'pos.view_totals', label: 'Vedere i totali del turno e la Z', help: 'Spento: la chiusura si fa contando senza vedere l’atteso.' },
    { permission: 'pos.reprint', label: 'Ristampare lo scontrino', help: 'Stampare di nuovo una vendita già stampata.' },
  ],
  scanner: [
    { permission: 'checkin.scan', label: 'Scansionare i biglietti', help: 'Sempre attivo: è il lavoro del varco.', required: true },
    { permission: 'checkin.revert', label: 'Annullare un ingresso', help: 'Anche dopo i 30 secondi, con conferma.' },
    { permission: 'pos.sell', label: 'Vendere all’ingresso', help: 'Pulsanti a pagamento come «+1 Bambino», sul turno di una cassa.' },
    { permission: 'checkin.collect_payment', label: 'Incassare gli ordini «Paga in loco»', help: 'Contanti o POS al varco, sul turno di una cassa aperta; poi entra.' },
    { permission: 'checkin.search', label: 'Cercare per nome', help: 'Mostra nomi e codici degli ordini: dati personali.' },
    { permission: 'checkin.stats', label: 'Vedere i contatori degli ingressi', help: 'Entrati e attesi in alto nello scanner.' },
  ],
};

export const DEVICE_KIND_LABEL: Record<DeviceKind, string> = { pos: 'Cassa', scanner: 'Varco' };

/** Ruolo che vale per i dispositivi abbinati prima dei permessi (permissions NULL). */
const KIND_ROLE = { pos: 'cashier', scanner: 'gate' } as const;

/** Permessi del ruolo, ristretti alle caselle del dispositivo: il comportamento di prima. */
export function roleDefaultPermissions(kind: DeviceKind): Permission[] {
  return DEVICE_PERMISSIONS[kind].map((p) => p.permission).filter((p) => MATRIX[p].includes(KIND_ROLE[kind]));
}

export type DevicePreset = { key: string; label: string; kind: DeviceKind; permissions: Permission[] };

export const DEVICE_PRESETS: readonly DevicePreset[] = [
  { key: 'cassa-principale', label: 'Cassa principale', kind: 'pos', permissions: ['pos.sell', 'pos.open_amount', 'pos.complimentary', 'pos.open_close_session', 'pos.view_totals', 'pos.reprint'] },
  { key: 'cassa-secondaria', label: 'Cassa secondaria', kind: 'pos', permissions: ['pos.sell', 'pos.open_amount', 'pos.reprint'] },
  { key: 'varco', label: 'Varco', kind: 'scanner', permissions: ['checkin.scan', 'checkin.revert', 'checkin.search', 'checkin.stats'] },
];

export function presetFor(kind: DeviceKind): DevicePreset {
  return DEVICE_PRESETS.find((p) => p.kind === kind)!;
}

/**
 * Controlla e ordina i permessi scelti per un dispositivo: solo le chiavi del suo ruolo, quelle
 * obbligatorie sempre presenti, senza doppioni. Restituisce l'errore in italiano se una chiave non vale.
 */
export function validateDevicePermissions(kind: DeviceKind, input: readonly string[]): { ok: true; permissions: Permission[] } | { ok: false; error: string } {
  const allowed = DEVICE_PERMISSIONS[kind];
  const wanted = new Set(input);
  for (const key of wanted) {
    if (!allowed.some((p) => p.permission === key)) return { ok: false, error: `Il permesso «${key}» non vale per un dispositivo ${kind === 'pos' ? 'di cassa' : 'del varco'}.` };
  }
  for (const p of allowed) if (p.required) wanted.add(p.permission);
  return { ok: true, permissions: allowed.map((p) => p.permission).filter((p) => wanted.has(p)) };
}

/** Permessi effettivi di un dispositivo: quelli salvati oppure, se mancano, quelli del ruolo. */
export function effectiveDevicePermissions(kind: DeviceKind, stored: readonly string[] | null | undefined): Permission[] {
  if (!stored) return roleDefaultPermissions(kind);
  const checked = validateDevicePermissions(
    kind,
    stored.filter((s) => DEVICE_PERMISSIONS[kind].some((p) => p.permission === s)),
  );
  return checked.ok ? checked.permissions : roleDefaultPermissions(kind);
}
