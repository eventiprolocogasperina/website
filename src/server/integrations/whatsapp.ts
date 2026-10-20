import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { log } from '@/server/log';

/**
 * WhatsApp Cloud API di Meta (modulo broadcast, prompt 18). Il token si legge da
 * WHATSAPP_ACCESS_TOKEN (o, finché esiste, dal valore salvato dalle impostazioni di prima) e non
 * compare mai nei log o nelle pagine. In locale il token è vuoto: nessuna chiamata. I test
 * sostituiscono il client con `setWhatsappClient`.
 */
export type WhatsappSendResult = { ok: true; id: string } | { ok: false; error: string };
export type WhatsappClient = {
  sendTemplate(input: { phoneNumberId: string; token: string; to: string; template: string; language: string; params: string[] }): Promise<WhatsappSendResult>;
};

const GRAPH = 'https://graph.facebook.com/v21.0';

const httpClient: WhatsappClient = {
  async sendTemplate({ phoneNumberId, token, to, template, language, params }) {
    try {
      const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: template, language: { code: language }, components: params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] : [] },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string; code?: number } };
      if (!res.ok || !data.messages?.[0]?.id) return { ok: false, error: `Meta ${data.error?.code ?? res.status}: ${(data.error?.message ?? 'errore').slice(0, 200)}` };
      return { ok: true, id: data.messages[0].id };
    } catch (error) {
      log.warn('Invio WhatsApp non riuscito', { error: error instanceof Error ? error.name : 'errore' });
      return { ok: false, error: 'Rete non raggiungibile' };
    }
  },
};

let current: WhatsappClient = httpClient;
export const whatsappClient = (): WhatsappClient => current;
/** Solo per i test: sostituisce il client (null = quello vero). */
export function setWhatsappClient(client: WhatsappClient | null): void {
  current = client ?? httpClient;
}

/** Meta firma ogni notifica del webhook con HMAC-SHA256 del corpo grezzo, usando l'App Secret. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string | undefined): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const given = Buffer.from(header.slice('sha256='.length));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Numero italiano nel formato di WhatsApp (393331234567); stringa vuota se non è un numero. */
export function toWhatsappNumber(phone: string | null | undefined): string {
  let n = (phone ?? '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if ((n.length === 9 || n.length === 10) && n.startsWith('3')) n = `39${n}`;
  return n.length >= 10 && n.length <= 15 ? n : '';
}

export const maskPhone = (n: string) => `***${n.slice(-3)}`;

/** Stati dei messaggi nella notifica del webhook: solo ID del messaggio, stato e codice d'errore. */
export function statusesOf(body: unknown): Array<{ id: string; status: string; error: string | null }> {
  const out: Array<{ id: string; status: string; error: string | null }> = [];
  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id?: string; status?: string; errors?: Array<{ code?: number; title?: string }> }> } }> }> })?.entry ?? [];
  for (const e of entries) {
    for (const c of e.changes ?? []) {
      for (const s of c.value?.statuses ?? []) {
        if (s.id && s.status) out.push({ id: s.id, status: s.status, error: s.errors?.[0] ? `${s.errors[0].code ?? ''} ${s.errors[0].title ?? ''}`.trim().slice(0, 200) : null });
      }
    }
  }
  return out;
}
