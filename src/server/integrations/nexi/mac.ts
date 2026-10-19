// Firma (MAC) dei messaggi Nexi XPay, "Pagamento semplice" (§3: verifica del MAC obbligatoria).
// Funzioni pure: la chiave arriva dal chiamante, così si testano senza variabili d'ambiente.
import { createHash, timingSafeEqual } from 'node:crypto';

const sha1 = (s: string) => createHash('sha1').update(s, 'utf8').digest('hex');

/** MAC della richiesta di pagamento: SHA1(codTrans=…divisa=…importo=…<chiave>). */
export function requestMac(p: { codTrans: string; divisa: string; importo: string }, key: string): string {
  return sha1(`codTrans=${p.codTrans}divisa=${p.divisa}importo=${p.importo}${key}`);
}

/** Campi dell'esito che entrano nel MAC, nell'ordine stabilito da Nexi. */
export const RESULT_MAC_FIELDS = ['codTrans', 'esito', 'importo', 'divisa', 'data', 'orario', 'codAut'] as const;

/** MAC dell'esito (ritorno del browser e notifica server-to-server). */
export function resultMac(p: Partial<Record<(typeof RESULT_MAC_FIELDS)[number], string>>, key: string): string {
  return sha1(`${RESULT_MAC_FIELDS.map((f) => `${f}=${p[f] ?? ''}`).join('')}${key}`);
}

/** true se il MAC ricevuto è quello atteso. Confronto a tempo costante, senza distinguere maiuscole. */
export function verifyResultMac(p: Record<string, string | undefined>, key: string): boolean {
  const got = (p.mac ?? '').toLowerCase();
  const want = resultMac(p, key);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

/**
 * codTrans di un tentativo di pagamento: il codice dell'ordine senza trattino più 8 caratteri del
 * momento in cui parte il tentativo (Nexi rifiuta un codTrans già usato, quindi "Riprova" ne crea
 * uno nuovo). Solo lettere e cifre, al massimo 30 caratteri.
 */
export function attemptCodTrans(orderCode: string, now: Date): string {
  const suffix = now.getTime().toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return `${orderCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()}${suffix}`;
}

/** Il codice dell'ordine (senza trattino) di un codTrans creato da attemptCodTrans. */
export function orderCodeFromCodTrans(codTrans: string): string | null {
  return /^[A-Z0-9]{3,22}$/.test(codTrans.slice(0, -8)) && codTrans.length > 8 ? codTrans.slice(0, -8) : null;
}

/** Importo nel formato di Nexi: centesimi interi, senza separatori. */
export const toImporto = (cents: number) => String(Math.round(cents));

/** Esiti di Nexi e cosa significano per il pagamento. */
export type NexiOutcome = 'succeeded' | 'failed' | 'cancelled' | 'pending';
export function outcomeOf(esito: string | undefined): NexiOutcome {
  switch ((esito ?? '').toUpperCase()) {
    case 'OK':
      return 'succeeded';
    case 'ANNULLO':
      return 'cancelled';
    case 'PEN':
      return 'pending';
    default:
      return 'failed';
  }
}
