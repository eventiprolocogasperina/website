'use server';

import { runAction } from '@/server/admin/run-action';
import { DomainError } from '@/server/domain/errors';
import { listDevices, revokeDevice } from '@/server/domain/devices';
import { resetOrderNumbering, saveRegister, setRegisterActive, type RegisterInput } from '@/server/domain/cash/registers';

// Azioni della pagina Cassa dell'admin (prompt 14). I permessi li controllano i servizi.

const paths = (edition: string) => [`/admin/e/${edition}/cassa`];

export async function saveRegisterAction(edition: string, id: string | null, input: RegisterInput) {
  return runAction(paths(edition), (ctx) => saveRegister(ctx, edition, id, input));
}

export async function setRegisterActiveAction(edition: string, id: string, active: boolean) {
  return runAction(paths(edition), (ctx) => setRegisterActive(ctx, edition, id, active));
}

export async function resetNumberingAction(edition: string, startFrom: number) {
  return runAction(paths(edition), (ctx) => resetOrderNumbering(ctx, edition, startFrom));
}

// QR di abbinamento e modifica dei dispositivi: app/admin/devices-actions.ts (comuni a Sistema, Cassa e Check-in).

export async function revokePosDeviceAction(edition: string, deviceId: string) {
  return runAction(paths(edition), async (ctx) => {
    // Solo i dispositivi di questa edizione si revocano da qui.
    const device = (await listDevices(ctx)).find((d) => d.id === deviceId);
    if (!device || device.edition !== edition) throw new DomainError('NOT_FOUND', { message: 'Dispositivo non trovato in questa edizione.' });
    await revokeDevice(ctx, deviceId);
  });
}
