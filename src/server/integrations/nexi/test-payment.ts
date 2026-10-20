import 'server-only';
import { attemptCodTrans, nexiMode, outcomeOf, paymentConfigStatus, requestMac, toImporto, verifyResultMac, type PaymentForm } from './index';
import { siteUrl } from '@/server/email/send';

// "Pagamento di prova da 1 €" di Sistema → Pagamenti (prompt 18): un pagamento che non appartiene a
// nessun ordine, per verificare alias, chiave MAC e indirizzi di ritorno. Il codTrans inizia con
// PROVA, così l'esito non passa mai da processResult e non tocca ordini o pagamenti.

export const TEST_AMOUNT_CENTS = 100;
export const isTestCodTrans = (codTrans: string) => codTrans.startsWith('PROVA');

/** Modulo da inviare a Nexi per 1 €, con ritorno alla pagina Pagamenti. */
export function testPaymentForm(now = new Date()): PaymentForm {
  const status = paymentConfigStatus();
  if (!status.ready) throw new Error('Nexi non configurato');
  const { alias, macKey, endpoint } = status.config!;
  const codTrans = attemptCodTrans('PROVA', now);
  const base = { codTrans, divisa: 'EUR', importo: toImporto(TEST_AMOUNT_CENTS) };
  const back = `${siteUrl()}/api/pagamenti/nexi/prova`;
  return { action: endpoint, fields: { alias, ...base, mac: requestMac(base, macKey), url: back, url_back: back, urlpost: back, languageId: 'ITA' } };
}

/** Esito del pagamento di prova: 'ok', 'ko', 'annullato' o 'firma' (MAC non valido). */
export function testPaymentOutcome(params: Record<string, string | undefined>): 'ok' | 'ko' | 'annullato' | 'firma' {
  const status = paymentConfigStatus();
  if (!status.ready || !isTestCodTrans(params.codTrans ?? '') || !verifyResultMac(params, status.config!.macKey)) return params.esito ? 'firma' : 'annullato';
  const o = outcomeOf(params.esito);
  return o === 'succeeded' ? 'ok' : o === 'cancelled' || o === 'pending' ? 'annullato' : 'ko';
}

export { nexiMode };
