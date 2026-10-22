import 'server-only';
import { eq } from 'drizzle-orm';
import { readBrand } from '@/lib/edition-theme';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import type { MyOrder } from '@/server/domain/checkout/my-tickets';
import { orderForTemplate, previewVars, renderTemplateEmail, TemplateInput } from '@/server/domain/email-templates';
import { sendLoggedEmail } from '@/server/domain/email-templates/log';
import { DomainError } from '@/server/domain/errors';
import { renderConfirmation } from './order-tickets';

// Anteprima e invio di prova dei modelli email (Sistema → Email, prompt 18). Si usa il testo in
// modifica (anche non salvato) con un ordine vero scelto dalla tendina o con valori d'esempio.

export type DraftInput = { key: string; edition: string | null; subject: string; body: string; orderId: string | null };

/** Ordine d'esempio per la conferma quando non se ne sceglie uno. */
function exampleOrder(): MyOrder {
  const now = new Date();
  return {
    id: 'esempio',
    code: 'ZK26-7F3K',
    status: 'paid',
    channel: 'online',
    totalCents: 1500,
    discountCents: 0,
    createdAt: now,
    paidAt: now,
    expiresAt: null,
    payable: false,
    accessToken: 'esempio',
    edition: { slug: 'esempio', title: 'Zuccaland 2026', location: 'Gasperina (CZ)', startsAt: now, endsAt: null, enabledModules: [], coverImage: null, theme: null, brand: readBrand(null), format: null, rulesUrl: null, map: null },
    session: null,
    customer: { name: 'Maria Rossi', email: 'maria@example.com' },
    lines: [{ name: 'Ingresso', quantity: 3, unitPriceCents: 500, totalCents: 1500, sessionLabel: 'Sab 24 ott' }],
    tickets: [{ id: 'esempio', qrToken: 'esempio', name: 'Ingresso', sessionLabel: 'Sab 24 ott', status: 'valid' }],
    dateChange: null,
    refund: { eligible: false, reason: '', refundableCents: 0, pending: false },
  };
}

async function build(ctx: Ctx, input: DraftInput) {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const draft = TemplateInput.parse({ key: input.key, edition: input.edition, subject: input.subject, body: input.body });
  const [edition] = draft.edition ? await getDb().select({ id: editions.id, slug: editions.slug }).from(editions).where(eq(editions.slug, draft.edition)) : [];
  const vars = await previewVars(ctx, input.orderId);
  if (draft.key === 'confirmation') {
    const real = input.orderId && can(ctx, 'orders.read') ? await orderForTemplate(input.orderId) : null;
    const email = await renderConfirmation(real ?? exampleOrder(), 'paid', draft, vars);
    return { email, editionId: edition?.id ?? null };
  }
  return { email: await renderTemplateEmail(draft.key, edition?.id ?? null, vars, draft), editionId: edition?.id ?? null };
}

/** Oggetto e HTML dell'anteprima. */
export async function previewTemplate(ctx: Ctx, input: DraftInput): Promise<{ subject: string; html: string }> {
  const { email } = await build(ctx, input);
  return { subject: email.subject, html: email.html };
}

/** Invio di prova all'indirizzo di chi lo chiede, nel registro degli invii e nel registro attività. */
export async function sendTestEmail(ctx: Ctx, input: DraftInput): Promise<{ to: string }> {
  if (!ctx.user?.email) throw new DomainError('VALIDATION', { message: 'Il tuo utente non ha un’email: aggiungila in Sistema → Utenti.' });
  const { email, editionId } = await build(ctx, input);
  const ok = await sendLoggedEmail({ to: ctx.user.email, subject: `[Prova] ${email.subject}`, html: email.html, text: email.text }, { templateKey: input.key, editionId, isTest: true });
  if (!ok) throw new DomainError('INTERNAL', { message: 'L’email di prova non è partita. Controlla il registro degli invii.' });
  await withTransaction((tx) => audit(tx, ctx, 'email_template.test_sent', { entityType: 'email_template', entityId: input.key, edition: input.edition }));
  return { to: ctx.user.email };
}
