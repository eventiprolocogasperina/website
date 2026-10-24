import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { systemCtx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { editions, ordersV2 } from '@/server/db/schema';
import { siteUrl } from '@/server/email/send';
import { publish } from '@/server/domain/events';
import { log } from '@/server/log';
import { recordPayment } from '@/server/domain/payments';
import { attemptCodTrans, orderCodeFromCodTrans, outcomeOf, requestMac, toImporto, verifyResultMac, type NexiOutcome } from './mac';

export * from './mac';

const TEST_ENDPOINT = 'https://int-ecommerce.nexi.it/ecomm/ecomm/DispatcherServlet';

/** Modalità: `test` (ambiente di prova di Nexi, il default), `produzione`, `simulatore` (solo in locale). */
export type NexiMode = 'test' | 'produzione' | 'simulatore';

export function nexiMode(): NexiMode {
  const m = process.env.NEXI_MODE;
  if (m === 'simulatore') return simulatorAllowed() ? 'simulatore' : 'test';
  if (m === 'produzione') return 'produzione';
  return process.env.NEXI_ENDPOINT && process.env.NEXI_ENDPOINT !== TEST_ENDPOINT ? 'produzione' : 'test';
}

/** Il simulatore non esiste mai sul sito pubblicato. */
export function simulatorAllowed(): boolean {
  return process.env.NEXI_MODE === 'simulatore' && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production';
}

function config() {
  const mode = nexiMode();
  const alias = process.env.NEXI_ALIAS ?? (mode === 'simulatore' ? 'SIMULATORE' : '');
  const macKey = process.env.NEXI_MAC_KEY ?? (mode === 'simulatore' ? 'chiave-del-simulatore' : '');
  if (!alias || !macKey) throw new Error('NEXI_ALIAS o NEXI_MAC_KEY mancanti');
  const endpoint = mode === 'simulatore' ? `${siteUrl()}/api/pagamenti/nexi/simulatore` : (process.env.NEXI_ENDPOINT ?? TEST_ENDPOINT);
  return { mode, alias, macKey, endpoint };
}

/** Configurazione completa (con la chiave): solo per firmare, mai verso una pagina. */
export function paymentConfigStatus(): { ready: true; config: ReturnType<typeof config> } | { ready: false; config: null } {
  try {
    return { ready: true, config: config() };
  } catch {
    return { ready: false, config: null };
  }
}

/** Stato per Sistema → Pagamenti: alias e ambiente; della chiave MAC solo se è impostata (§18.2). */
export function nexiStatus() {
  const mode = nexiMode();
  const s = paymentConfigStatus();
  return {
    mode,
    alias: s.config?.alias ?? process.env.NEXI_ALIAS ?? '',
    macKeySet: !!process.env.NEXI_MAC_KEY || mode === 'simulatore',
    endpoint: s.config?.endpoint ?? process.env.NEXI_ENDPOINT ?? TEST_ENDPOINT,
    ready: s.ready,
  };
}

/** Chiave del MAC, per il simulatore (che firma gli esiti come farebbe Nexi). */
export const simulatorMacKey = () => config().macKey;

export type PaymentForm = { action: string; fields: Record<string, string> };

/**
 * Modulo da inviare a Nexi (POST dal browser) per pagare un ordine in attesa.
 * L'importo è il totale dell'ordine salvato dal server, mai un valore arrivato dal browser.
 */
export function paymentForm(order: { code: string; totalCents: number }, now = new Date()): PaymentForm {
  const { alias, macKey, endpoint } = config();
  const codTrans = attemptCodTrans(order.code, now);
  const base = { codTrans, divisa: 'EUR', importo: toImporto(order.totalCents) };
  const site = siteUrl();
  return {
    action: endpoint,
    fields: {
      alias,
      ...base,
      mac: requestMac(base, macKey),
      url: `${site}/api/pagamenti/nexi/esito`,
      url_back: `${site}/api/pagamenti/nexi/annullato`,
      urlpost: `${site}/api/pagamenti/nexi/notifica`,
      languageId: 'ITA',
    },
  };
}

/** Campi della risposta di Nexi che si salvano sul pagamento: niente nome, email o carta del cliente. */
const RAW_FIELDS = ['codTrans', 'esito', 'importo', 'divisa', 'data', 'orario', 'codAut', 'codiceEsito', 'messaggio', 'brand', 'tipoTransazione', 'tipoProdotto', 'nazionalita'];

export type NexiResult =
  | { ok: false; reason: 'mac' | 'unknown_order' }
  | { ok: true; outcome: NexiOutcome | 'amount_mismatch'; order: { id: string; code: string; accessToken: string; edition: string; status: string } };

/**
 * Esito di un pagamento, dal ritorno del browser (`url`) o dalla notifica di Nexi (`urlpost`).
 * Si può ricevere più volte: `recordPayment` è idempotente sul codTrans.
 * 1. firma verificata, altrimenti nulla;
 * 2. l'importo pagato deve essere il totale dell'ordine, altrimenti l'ordine non diventa pagato e parte un allarme;
 * 3. OK → pagamento riuscito; KO o errore → pagamento non riuscito; annullo o in attesa → nessun pagamento.
 */
export async function processResult(params: Record<string, string | undefined>, source: 'browser' | 'server'): Promise<NexiResult> {
  const { macKey } = config();
  const codTrans = params.codTrans ?? '';
  if (!verifyResultMac(params, macKey)) {
    log.warn('Esito Nexi con firma non valida', { source, codTrans });
    return { ok: false, reason: 'mac' };
  }
  const compact = orderCodeFromCodTrans(codTrans);
  const code = compact ? `${compact.slice(0, -4)}-${compact.slice(-4)}` : null;
  const [order] = code
    ? await getDb()
        .select({ id: ordersV2.id, code: ordersV2.code, accessToken: ordersV2.accessToken, totalCents: ordersV2.totalCents, status: ordersV2.status, edition: editions.slug })
        .from(ordersV2)
        .innerJoin(editions, eq(editions.id, ordersV2.editionId))
        .where(and(eq(ordersV2.code, code), isNull(ordersV2.deletedAt)))
    : [];
  if (!order) {
    log.error('Esito Nexi per un ordine che non esiste', { source, codTrans });
    return { ok: false, reason: 'unknown_order' };
  }
  const view = { id: order.id, code: order.code, accessToken: order.accessToken, edition: order.edition, status: order.status as string };
  const outcome = outcomeOf(params.esito);
  if (outcome === 'cancelled' || outcome === 'pending') return { ok: true, outcome, order: view };

  const paid = Number(params.importo);
  const raw = { ...Object.fromEntries(RAW_FIELDS.filter((f) => params[f] !== undefined).map((f) => [f, params[f]])), fonte: source };
  const providerRef = `nexi:${codTrans}`;
  if (outcome === 'succeeded' && (params.divisa !== 'EUR' || paid !== order.totalCents)) {
    // Il pagamento resta "in attesa" (visibile nell'ordine) e l'ordine non diventa pagato.
    // Esito e notifica arrivano entrambi: l'allarme parte una volta sola.
    const amountCents = Number.isInteger(paid) && paid >= 0 ? paid : 0;
    const r = await recordPayment(systemCtx('nexi'), { orderId: order.id, method: 'nexi', amountCents, status: 'pending', providerRef, raw: { ...raw, problema: 'importo diverso dal totale' } });
    // L'allarme Telegram lo manda l'handler dell'evento (notifiche per edizione, prompt 18).
    if (!r.duplicate) await publish([{ type: 'payment.amount_mismatch', orderId: order.id, code: order.code, edition: order.edition, paidCents: amountCents, totalCents: order.totalCents }]);
    return { ok: true, outcome: 'amount_mismatch', order: view };
  }

  const result = await recordPayment(systemCtx('nexi'), {
    orderId: order.id,
    method: 'nexi',
    amountCents: outcome === 'succeeded' ? paid : order.totalCents,
    status: outcome,
    providerRef,
    raw,
  });
  return { ok: true, outcome, order: { ...view, status: result.orderStatus } };
}
