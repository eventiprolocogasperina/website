import 'server-only';
import { z } from 'zod';
import { getDb } from '@/server/db/client';
import { reviews } from '@/server/db/schema';

/** Recensione lasciata dalla pagina "Grazie" di un format (blocco Ricordi). Nome facoltativo, niente email. */
export const ReviewInput = z.object({
  source: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1, 'Scegli da 1 a 5 stelle.').max(5),
  name: z.string().trim().max(80).optional(),
  comment: z.string().trim().max(1000, 'Al massimo 1000 caratteri.').optional(),
  /** Campo nascosto anti-bot: chi lo riempie non viene salvato. */
  website: z.string().max(0).optional(),
});
export type ReviewInput = z.input<typeof ReviewInput>;

export async function submitReview(input: ReviewInput): Promise<void> {
  const data = ReviewInput.parse(input);
  await getDb()
    .insert(reviews)
    .values({ eventId: data.source, rating: data.rating, name: data.name || null, comment: data.comment || null });
}
