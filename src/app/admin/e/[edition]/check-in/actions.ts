'use server';

import { runAction } from '@/server/admin/run-action';
import { deleteCheckinList, saveCheckinList, setScannerV2 } from '@/server/domain/checkin';
import { revokeDevice } from '@/server/domain/devices';

type ListInput = { name: string; productIds: string[]; sessionId: string | null; allowMultiple: boolean };

const paths = (edition: string) => [`/admin/e/${edition}/check-in`];

export async function saveCheckinListAction(edition: string, id: string | null, input: ListInput) {
  return runAction(paths(edition), (ctx) => saveCheckinList(ctx, edition, id, input));
}

export async function deleteCheckinListAction(edition: string, id: string) {
  return runAction(paths(edition), (ctx) => deleteCheckinList(ctx, edition, id));
}

// QR di abbinamento e modifica dei dispositivi: app/admin/devices-actions.ts (comuni a Sistema, Cassa e Check-in).

export async function revokeScannerAction(edition: string, deviceId: string) {
  return runAction(paths(edition), (ctx) => revokeDevice(ctx, deviceId));
}

export async function setScannerV2Action(edition: string, enabled: boolean) {
  return runAction(paths(edition), (ctx) => setScannerV2(ctx, enabled));
}
