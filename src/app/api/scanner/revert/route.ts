import { revertCheckin } from '@/server/domain/checkin';
import { body, scannerRoute } from '../respond';

/** Motivo nel registro: il telefono dice solo da dove arriva l'annullo, il testo lo sceglie il server. */
const REASONS = {
  ultimo: 'Annullato dallo scanner',
  ricerca: 'Annullato dopo, dalla ricerca dello scanner',
  esito: 'Annullato dopo, dall’esito «Già entrato» dello scanner',
} as const;

/**
 * Annullo di un ingresso: "Annulla ultimo" per 30 secondi dopo un ingresso valido, oppure dopo,
 * con conferma, dalla ricerca o dall'esito "Già entrato".
 */
export async function POST(request: Request) {
  const input = await body(request);
  const from = typeof input.from === 'string' && Object.hasOwn(REASONS, input.from) ? (input.from as keyof typeof REASONS) : 'ultimo';
  return scannerRoute('checkin.revert', async (ctx) => {
    await revertCheckin(ctx, { checkinId: String(input.checkinId ?? ''), reason: REASONS[from] });
    return { ok: true };
  });
}
