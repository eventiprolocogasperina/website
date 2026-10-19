import 'server-only';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Tx } from '@/server/db/client';
import { customers } from '@/server/db/schema';

export const CustomerInput = z.object({
  email: z.string().trim().toLowerCase().email('Email non valida.').max(200),
  name: z.string().trim().min(2, 'Scrivi nome e cognome.').max(120).nullish(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[\d\s.-]{6,}$/, 'Telefono non valido.')
    .nullish()
    .or(z.literal('').transform(() => null)),
  marketingConsent: z.boolean().optional(),
});
export type CustomerInput = z.input<typeof CustomerInput>;

/**
 * Trova o crea il cliente per email (minuscola), dentro la transazione dell'ordine.
 * Nome e telefono si completano se mancano ma non si sovrascrivono: chi conosce un'email altrui non
 * può cambiare i dati di quel cliente. Il consenso marketing si può dare qui, non togliere.
 */
export async function upsertByEmail(tx: Tx, input: CustomerInput): Promise<{ id: string }> {
  const data = CustomerInput.parse(input);
  const consent = data.marketingConsent === true;
  const [row] = await tx
    .insert(customers)
    .values({ email: data.email, name: data.name ?? null, phone: data.phone ?? null, marketingConsent: consent, consentAt: consent ? new Date() : null })
    .onConflictDoUpdate({
      target: customers.email,
      set: {
        name: sql`coalesce(${customers.name}, excluded.name)`,
        phone: sql`coalesce(${customers.phone}, excluded.phone)`,
        marketingConsent: sql`${customers.marketingConsent} OR excluded.marketing_consent`,
        consentAt: sql`CASE WHEN ${customers.marketingConsent} THEN ${customers.consentAt} ELSE excluded.consent_at END`,
        deletedAt: sql`NULL`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: customers.id });
  return row;
}

