import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { render } from '@react-email/render';
import { renderToBuffer } from '@react-pdf/renderer';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmationEmail';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { OrderTicketsPdf, type OrderTicketsPdfData } from '@/lib/tickets/OrderTicketsPdf';
import { getDb } from '@/server/db/client';
import { ordersV2 } from '@/server/db/schema';
import { getOrderByToken, type MyOrder } from '@/server/domain/checkout/my-tickets';
import { log } from '@/server/log';
import { sendEmail, siteUrl } from './send';

/** Colore dell'edizione nei biglietti e nell'email. */
export const accentFor = (slug: string) => (slug.startsWith('zuccaland') ? '#c2410c' : '#283983');

const qr = (data: string, width = 220) => QRCode.toDataURL(data, { errorCorrectionLevel: 'M', margin: 1, width, color: { dark: '#1a1a1a', light: '#ffffff' } });

export const myTicketsUrl = (token: string) => `${siteUrl()}/i-miei-biglietti/${token}`;

let logoCache: string | undefined;
async function logo(): Promise<string | undefined> {
  if (logoCache === undefined) {
    try {
      logoCache = `data:image/png;base64,${(await readFile(path.join(process.cwd(), 'public/img/logo_white_fg.png'))).toString('base64')}`;
    } catch {
      logoCache = '';
    }
  }
  return logoCache || undefined;
}

const whenOf = (o: MyOrder) => (o.session ? formatDateTime(o.session.startsAt) : o.edition.startsAt ? formatDateTime(o.edition.startsAt) : null);

/** PDF dei biglietti validi dell'ordine. */
export async function renderOrderPdf(o: MyOrder): Promise<Buffer> {
  const valid = o.tickets.filter((t) => t.status !== 'void');
  const unit = new Map(o.lines.map((l) => [l.name, l.unitPriceCents]));
  const data: OrderTicketsPdfData = {
    code: o.code,
    editionTitle: o.edition.title,
    location: o.edition.location,
    when: whenOf(o),
    buyerName: o.customer?.name ?? null,
    issuedOn: formatDate(o.paidAt ?? o.createdAt),
    totalLabel: formatMoney(o.totalCents),
    tickets: await Promise.all(
      valid.map(async (t) => ({ id: t.id, name: t.name, when: t.sessionLabel, priceLabel: formatMoney(unit.get(t.name) ?? 0), qrDataUri: await qr(t.qrToken) })),
    ),
    otherLines: o.lines.filter((l) => !valid.some((t) => t.name === l.name)).map((l) => ({ name: l.name, quantity: l.quantity, totalLabel: formatMoney(l.totalCents) })),
    accent: accentFor(o.edition.slug),
    logo: await logo(),
  };
  return renderToBuffer(<OrderTicketsPdf data={data} />);
}

/**
 * Email con i biglietti in PDF: alla conferma del pagamento (`order.paid`) e quando lo staff li rimanda.
 * Restituisce false se l'ordine non ha un'email o non ha biglietti validi.
 */
export async function sendOrderTickets(orderId: string, opts: { reason: 'paid' | 'resent' } = { reason: 'paid' }): Promise<boolean> {
  const [row] = await getDb().select({ token: ordersV2.accessToken }).from(ordersV2).where(eq(ordersV2.id, orderId));
  const o = row ? await getOrderByToken(row.token) : null;
  if (!o?.customer?.email) return false;
  const valid = o.tickets.filter((t) => t.status !== 'void');
  if (!valid.length && opts.reason === 'paid' && !o.lines.length) return false;

  const [pdf, html] = await Promise.all([
    renderOrderPdf(o),
    render(
      <OrderConfirmationEmail
        reason={opts.reason}
        name={o.customer.name}
        code={o.code}
        editionTitle={o.edition.title}
        when={whenOf(o)}
        location={o.edition.location}
        lines={o.lines.map((l) => ({ label: `${l.quantity}× ${l.name}${l.sessionLabel ? ` · ${l.sessionLabel}` : ''}`, amount: formatMoney(l.totalCents) }))}
        total={formatMoney(o.totalCents)}
        ticketCount={valid.length}
        myTicketsUrl={myTicketsUrl(o.accessToken)}
        qrSrc={valid[0] ? await qr(valid[0].qrToken, 360) : await qr(o.code, 360)}
        accent={accentFor(o.edition.slug)}
      />,
    ),
  ]);
  const text = [
    `${opts.reason === 'resent' ? 'I tuoi biglietti' : 'Ordine confermato'}: ${o.edition.title}`,
    `Codice ordine: ${o.code}`,
    whenOf(o) ? `Quando: ${whenOf(o)}` : '',
    ...o.lines.map((l) => `${l.quantity}× ${l.name}: ${formatMoney(l.totalCents)}`),
    `Totale: ${formatMoney(o.totalCents)}`,
    `I miei biglietti: ${myTicketsUrl(o.accessToken)}`,
  ]
    .filter(Boolean)
    .join('\n');
  const ok = await sendEmail({
    to: o.customer.email,
    subject: opts.reason === 'resent' ? `I tuoi biglietti per ${o.edition.title} (${o.code})` : `Biglietti ${o.edition.title} · ordine ${o.code}`,
    html,
    text,
    attachments: [{ filename: `biglietti-${o.code}.pdf`, content: pdf }],
  });
  if (!ok) log.error('Email dei biglietti non inviata', { code: o.code });
  return ok;
}
