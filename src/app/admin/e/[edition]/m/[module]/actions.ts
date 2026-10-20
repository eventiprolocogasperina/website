'use server';

import { previewWhatsappBroadcast, sendWhatsappBroadcast } from '@/modules/broadcast/whatsapp';
import { postponeSession } from '@/modules/postponement/server';
import { runAction } from '@/server/admin/run-action';

export async function postponeSessionAction(edition: string, input: { editionId: string; sessionId: string; toSessionId: string; reason: string | null }) {
  return runAction([`/admin/e/${edition}`], (ctx) => postponeSession(ctx, input));
}

type Segment = { editionId: string; sessionId: string | null; checkedIn: 'any' | 'in' | 'out'; templateName: string };

export async function previewWhatsappAction(input: Segment) {
  return runAction([], (ctx) => previewWhatsappBroadcast(ctx, input));
}

export async function sendWhatsappAction(edition: string, input: Segment & { requestId: string; expectedRecipients: number }) {
  return runAction([`/admin/e/${edition}/m/broadcast`], (ctx) => sendWhatsappBroadcast(ctx, input));
}
