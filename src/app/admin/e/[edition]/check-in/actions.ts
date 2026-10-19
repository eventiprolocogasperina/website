'use server';

import QRCode from 'qrcode';
import { runAction } from '@/server/admin/run-action';
import { deleteCheckinList, saveCheckinList, setScannerV2 } from '@/server/domain/checkin';
import { createPairing, revokeDevice } from '@/server/domain/devices';
import { siteUrl } from '@/server/email/send';

type ListInput = { name: string; productIds: string[]; sessionId: string | null; allowMultiple: boolean };

const paths = (edition: string) => [`/admin/e/${edition}/check-in`];

export async function saveCheckinListAction(edition: string, id: string | null, input: ListInput) {
  return runAction(paths(edition), (ctx) => saveCheckinList(ctx, edition, id, input));
}

export async function deleteCheckinListAction(edition: string, id: string) {
  return runAction(paths(edition), (ctx) => deleteCheckinList(ctx, edition, id));
}

/** QR di abbinamento di un telefono o tablet come scanner di questa edizione (10 minuti, una volta). */
export async function pairScannerAction(edition: string, name: string) {
  return runAction(paths(edition), async (ctx) => {
    const { token, expiresAt } = await createPairing(ctx, { name, edition, kind: 'scanner' });
    const url = `${siteUrl()}/abbina/${token}`;
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 280 });
    return { url, qr, expiresAt };
  });
}

export async function revokeScannerAction(edition: string, deviceId: string) {
  return runAction(paths(edition), (ctx) => revokeDevice(ctx, deviceId));
}

export async function setScannerV2Action(edition: string, enabled: boolean) {
  return runAction(paths(edition), (ctx) => setScannerV2(ctx, enabled));
}
