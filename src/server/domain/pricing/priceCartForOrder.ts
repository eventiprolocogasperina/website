import 'server-only';
import { neon } from '@neondatabase/serverless';
import { getLegacyCatalog } from './legacyCatalog';
import { priceCart, PricingError, type CartLineInput, type DiscountRow, type PricedCart } from './priceCart';

/**
 * Legge listino e sconto dal database e calcola il carrello.
 * Lo sconto si identifica con il codice oppure con l'id restituito da /api/discounts/apply
 * (è quello che la pagina Zuccaland invia oggi): in entrambi i casi viene riletto e
 * validato qui, non si usa nulla di quanto calcolato dal browser.
 */
export async function priceCartForOrder(input: {
  eventId: string;
  lines: CartLineInput[];
  discountCode?: string | null;
  discountId?: string | null;
}): Promise<PricedCart> {
  const catalog = await getLegacyCatalog(input.eventId);
  if (!catalog) throw new PricingError('UNKNOWN_PRODUCT', `Evento sconosciuto: ${input.eventId}`);

  const ref = input.discountCode?.trim() || input.discountId?.trim() || null;
  let discount: DiscountRow | null = null;
  if (ref) {
    if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
    const sql = neon(process.env.POSTGRES_URL);
    const rows = input.discountCode?.trim()
      ? await sql`SELECT * FROM discounts WHERE code = ${ref.toUpperCase()} LIMIT 1`
      : await sql`SELECT * FROM discounts WHERE id = ${ref} LIMIT 1`;
    discount = (rows[0] as DiscountRow | undefined) ?? null;
  }

  return priceCart({ lines: input.lines, discountCode: ref }, catalog, discount);
}
