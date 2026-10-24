import 'server-only';
import { render } from '@react-email/render';
import { renderToBuffer } from '@react-pdf/renderer';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmationEmail';
import { formatDate, formatDateTime, romeTime } from '@/lib/dates';
import { editionTheme } from '@/lib/edition-theme';
import { formatMoney } from '@/lib/money';
import { OrderTicketsPdf, type OrderTicketsPdfData } from '@/lib/tickets/OrderTicketsPdf';
import { orderSummary } from '@/lib/tickets/order-summary';
import { getDb } from '@/server/db/client';
import { ordersV2 } from '@/server/db/schema';
import { getOrderByToken, type MyOrder } from '@/server/domain/checkout/my-tickets';
import { log } from '@/server/log';
import { pdfImage } from './pdf-image';
import { siteUrl } from './send';
import type { TemplateVars } from '@/server/domain/email-templates/defaults';
import { resolveTemplate, varsForOrder } from '@/server/domain/email-templates';
import { sendLoggedEmail } from '@/server/domain/email-templates/log';
import { PARAGRAPH_STYLE, renderBodyHtml, renderText } from '@/server/domain/email-templates/render';

/** Colori dell'edizione nei biglietti e nell'email: dal tema del format (series.theme), mai dallo slug (§1.1). */
export const pdfColorsFor = (o: Pick<MyOrder, 'edition'>) => {
  const t = editionTheme(o.edition.theme);
  return { accent: t.accent, header: t.pdfHeader, highlight: t.brand };
};

const qr = (data: string, width = 220) => QRCode.toDataURL(data, { errorCorrectionLevel: 'M', margin: 1, width, color: { dark: '#1a1a1a', light: '#ffffff' } });

export const myTicketsUrl = (token: string) => `${siteUrl()}/i-miei-biglietti/${token}`;

/** Logo Pro Loco (bianco, per la testata scura): c'è sempre, anche quando il format non ha un logo. */
const logo = () => pdfImage('/img/logo_white_fg.png');

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
    ...orderSummary(o),
    tickets: await Promise.all(
      valid.map(async (t) => ({ id: t.id, name: t.name, when: t.sessionLabel, priceLabel: formatMoney(unit.get(t.name) ?? 0), qrDataUri: await qr(t.qrToken) })),
    ),
    otherLines: o.lines.filter((l) => !valid.some((t) => t.name === l.name)).map((l) => ({ name: l.name, quantity: l.quantity, totalLabel: formatMoney(l.totalCents) })),
    ...pdfColorsFor(o),
    logo: await logo(),
    // Logo del format per fondo scuro (o quello normale): locale o https, scaricato con un limite di tempo.
    eventLogo: await pdfImage(o.edition.brand.logoOnDark),
    opening: o.session ? `Ingresso dalle ore ${romeTime(o.session.startsAt)}` : o.edition.startsAt ? `Apertura dalle ore ${romeTime(o.edition.startsAt)}` : null,
  };
  return renderToBuffer(<OrderTicketsPdf data={data} />);
}

export type ConfirmationTemplate = { subject: string; body: string };

/** Oggetto, HTML e testo dell'email di conferma con il modello dato: per l'invio e per l'anteprima in admin. */
export async function renderConfirmation(o: MyOrder, reason: 'paid' | 'resent', template: ConfirmationTemplate, vars: TemplateVars = varsForOrder(o)) {
  const valid = o.tickets.filter((t) => t.status !== 'void');
  const html = await render(
    <OrderConfirmationEmail
      reason={reason}
      name={o.customer?.name ?? null}
      code={o.code}
      editionTitle={o.edition.title}
      when={whenOf(o)}
      location={o.edition.location}
      lines={o.lines.map((l) => ({ label: `${l.quantity}× ${l.name}${l.sessionLabel ? ` · ${l.sessionLabel}` : ''}`, amount: formatMoney(l.totalCents) }))}
      total={formatMoney(o.totalCents)}
      totalTitle={orderSummary(o).totalTitle}
      discountLabel={orderSummary(o).discountLabel}
      ticketCount={valid.length}
      myTicketsUrl={myTicketsUrl(o.accessToken)}
      qrSrc={valid[0] ? await qr(valid[0].qrToken, 360) : await qr(o.code, 360)}
      accent={pdfColorsFor(o).accent}
      introHtml={renderBodyHtml(template.body, vars, PARAGRAPH_STYLE)}
    />,
  );
  const text = [
    renderText(template.body, vars),
    `Codice ordine: ${o.code}`,
    whenOf(o) ? `Quando: ${whenOf(o)}` : '',
    ...o.lines.map((l) => `${l.quantity}× ${l.name}: ${formatMoney(l.totalCents)}`),
    orderSummary(o).discountLabel ?? '',
    `${orderSummary(o).totalTitle}: ${formatMoney(o.totalCents)}`,
    `I miei biglietti: ${myTicketsUrl(o.accessToken)}`,
  ]
    .filter(Boolean)
    .join('\n');
  return { subject: renderText(template.subject, vars), html, text };
}

/**
 * Email con i biglietti in PDF: alla conferma del pagamento (`order.paid`) e quando lo staff li rimanda.
 * Il testo è il modello "Conferma ordine" dell'edizione (o globale, o predefinito), letto al momento
 * dell'invio. Restituisce false se l'ordine non ha un'email o non ha biglietti validi.
 */
export async function sendOrderTickets(orderId: string, opts: { reason: 'paid' | 'resent' } = { reason: 'paid' }): Promise<boolean> {
  const [row] = await getDb().select({ token: ordersV2.accessToken, editionId: ordersV2.editionId }).from(ordersV2).where(eq(ordersV2.id, orderId));
  const o = row ? await getOrderByToken(row.token) : null;
  if (!row || !o?.customer?.email) return false;
  const valid = o.tickets.filter((t) => t.status !== 'void');
  if (!valid.length && opts.reason === 'paid' && !o.lines.length) return false;

  const template = await resolveTemplate('confirmation', row.editionId);
  const [pdf, email] = await Promise.all([renderOrderPdf(o), renderConfirmation(o, opts.reason, template)]);
  const ok = await sendLoggedEmail(
    { to: o.customer.email, ...email, attachments: [{ filename: `biglietti-${o.code}.pdf`, content: pdf }] },
    { templateKey: 'confirmation', editionId: row.editionId, orderId },
  );
  if (!ok) log.error('Email dei biglietti non inviata', { code: o.code });
  return ok;
}
