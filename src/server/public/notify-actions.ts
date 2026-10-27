'use server';

import { subscribeNotify, unsubscribeNotify, type SubscribeInput } from '@/server/domain/pages/notify';
import { submitReview, type ReviewInput } from '@/server/domain/pages/reviews';
import { runPublic } from './run-public';

/** Iscrizione "Avvisami" dalla pagina del format: 5 tentativi per IP ogni 15 minuti. */
export async function subscribeNotifyAction(input: SubscribeInput) {
  return runPublic('avvisami', 5, () => subscribeNotify(input));
}

/** Disiscrizione dal link dell'email. */
export async function unsubscribeNotifyAction(token: string) {
  return runPublic('avvisami-annulla', 20, () => unsubscribeNotify(token));
}

/** Recensione dalla pagina "Grazie" (blocco Ricordi): 3 per IP ogni 15 minuti. */
export async function submitReviewAction(input: ReviewInput) {
  return runPublic('recensione', 3, () => submitReview(input));
}
