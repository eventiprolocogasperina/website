'use server';

import QRCode from 'qrcode';
import { runAction } from '@/server/admin/run-action';
import { createPairing, updateDevice, type DeviceConfigInput } from '@/server/domain/devices';
import { siteUrl } from '@/server/email/send';

// Azioni comuni ai dialoghi dei dispositivi (Sistema › Utenti, Cassa e Check-in dell'edizione).
// I permessi li controlla il servizio (settings.manage), insieme a cassa e permessi del dispositivo.

const paths = (edition: string) => ['/admin/sistema/utenti', `/admin/e/${edition}/cassa`, `/admin/e/${edition}/check-in`];

export type PairingResult = { url: string; qr: string; pin: string; expiresAt: string };

/** QR e PIN di abbinamento con nome, persona, cassa e permessi già scelti (10 minuti, una volta). */
export async function pairDeviceAction(input: DeviceConfigInput & { edition: string; kind: 'pos' | 'scanner' }) {
  return runAction(paths(input.edition), async (ctx): Promise<PairingResult> => {
    const { token, pin, expiresAt } = await createPairing(ctx, input);
    const url = `${siteUrl()}/abbina/${token}`;
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 280 });
    return { url, qr, pin, expiresAt };
  });
}

/**
 * Modifica di un dispositivo già abbinato: vale dalla prossima richiesta del telefono.
 * `edition`: la pagina dell'edizione da cui si modifica (solo i suoi dispositivi).
 */
export async function updateDeviceAction(deviceId: string, edition: string, input: DeviceConfigInput, onlyThisEdition: boolean) {
  return runAction(paths(edition), (ctx) => updateDevice(ctx, deviceId, input, onlyThisEdition ? { edition } : {}));
}
