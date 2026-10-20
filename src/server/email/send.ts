import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SafeResend as Resend } from '@/server/email/resend';
import { log } from '@/server/log';

export const FROM_ADDRESS = 'Pro Loco Gasperina <biglietti@prolocogasperina.it>';

/** Indirizzo pubblico del sito per i link nelle email. Mai dall'header Host, che si può falsificare. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it').replace(/\/$/, '');
}

export type Email = { to: string; subject: string; html: string; text: string; attachments?: Array<{ filename: string; content: Buffer }> };

export type Delivery = { status: 'sent' | 'outbox' | 'failed'; providerId?: string; error?: string };

/**
 * Invia un'email con Resend e restituisce l'esito con l'ID del messaggio (per il registro degli invii).
 * In sviluppo, con EMAIL_DEV_OUTBOX=1, la scrive invece in dev/outbox/ (cartella non versionata)
 * per poter aprire i link senza un servizio di posta.
 */
export async function deliverEmail(email: Email): Promise<Delivery> {
  if (process.env.EMAIL_DEV_OUTBOX === '1' && process.env.NODE_ENV !== 'production') {
    const dir = path.join(process.cwd(), 'dev', 'outbox');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
    await writeFile(file, `<!-- A: ${email.to} | Oggetto: ${email.subject} -->\n${email.html}`);
    for (const a of email.attachments ?? []) await writeFile(file.replace(/\.html$/, `-${a.filename}`), a.content);
    log.info('Email scritta nella cartella dev/outbox', { file: path.basename(file) });
    return { status: 'outbox', providerId: path.basename(file) };
  }
  if (!process.env.RESEND_API_KEY) {
    log.error('RESEND_API_KEY mancante: email non inviata', { subject: email.subject });
    return { status: 'failed', error: 'RESEND_API_KEY mancante' };
  }
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM_ADDRESS, ...email });
  if (error) {
    log.error('Invio email non riuscito', { subject: email.subject, error: error.message });
    return { status: 'failed', error: error.message.slice(0, 300) };
  }
  return { status: 'sent', providerId: data?.id };
}

/** Come deliverEmail, solo vero o falso: per gli invii che non vanno nel registro (password, inviti). */
export async function sendEmail(email: Email): Promise<boolean> {
  return (await deliverEmail(email)).status !== 'failed';
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Email semplice, con un pulsante facoltativo: inviti, reimpostazione della password, avvisi ai clienti. */
export function actionEmail({ to, subject, intro, button, url, outro }: { to: string; subject: string; intro: string; button?: string; url?: string; outro: string }): Email {
  const action = button && url ? `<tr><td style="padding-bottom:24px"><a href="${escape(url)}" style="display:inline-block;background:#1f4fbf;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escape(button)}</a></td></tr>\n` : '';
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#f5f6f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c2130">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:14px;color:#666d80;padding-bottom:16px">Pro Loco Gasperina</td></tr>
<tr><td style="font-size:20px;font-weight:600;padding-bottom:12px">${escape(subject)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;padding-bottom:24px">${escape(intro)}</td></tr>
${action}<tr><td style="font-size:13px;line-height:1.5;color:#666d80">${escape(outro)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${subject}\n\n${intro}\n\n${button && url ? `${button}: ${url}\n\n` : ''}${outro}\n`;
  return { to, subject, html, text };
}
