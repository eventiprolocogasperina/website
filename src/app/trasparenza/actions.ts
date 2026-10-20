'use server';

import { createPrivacyRequest } from '@/server/domain/site/transparency';
import { runPublic } from '@/server/public/run-public';
import type { PrivacyRequestInput } from '@/lib/public/transparency';

/** Modulo "Esercita i tuoi diritti": al massimo 5 richieste ogni 15 minuti per indirizzo IP. */
export async function sendPrivacyRequest(input: PrivacyRequestInput) {
  return runPublic('privacy-request', 5, async (ip) => {
    await createPrivacyRequest(ip, input);
    return null;
  });
}
