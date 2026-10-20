'use server';

import { runAction } from '@/server/admin/run-action';
import { publishTransparency, updatePrivacyRequest } from '@/server/domain/site/transparency';
import type { PrivacyRequestStatus, TransparencyContent } from '@/lib/public/transparency';

const PATHS = ['/admin/sito/trasparenza', '/trasparenza'];

export async function publishTransparencyAction(content: TransparencyContent, note: string) {
  return runAction(PATHS, (ctx) => publishTransparency(ctx, { content, note }).then(() => undefined));
}

export async function updatePrivacyRequestAction(id: string, status: PrivacyRequestStatus, resolutionNote: string) {
  return runAction(PATHS, (ctx) => updatePrivacyRequest(ctx, id, { status, resolutionNote }));
}
