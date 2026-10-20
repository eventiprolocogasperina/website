import 'server-only';
import { and, count, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { editions, emailTemplates, ordersV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { getOrderByToken, type MyOrder } from '@/server/domain/checkout/my-tickets';
import { siteUrl } from '@/server/email/send';
import { isTemplateKey, TEMPLATE_DEFAULTS, TEMPLATE_KEYS, type TemplateKey, type TemplateVars } from './defaults';
import { exampleVars, renderLayoutEmail, unknownVariables } from './render';

// Modelli email (prompt 18): predefiniti nel codice, sovrascrivibili da admin per tutte le edizioni o
// per una sola. L'email parte sempre con il testo salvato al momento dell'invio: nessun deploy.

export type ResolvedTemplate = { subject: string; body: string; source: 'edition' | 'global' | 'default'; updatedAt: Date | null };

/** Il modello da usare: quello dell'edizione, altrimenti quello globale modificato, altrimenti il predefinito. */
export async function resolveTemplate(key: TemplateKey, editionId: string | null): Promise<ResolvedTemplate> {
  const rows = await getDb()
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.key, key), editionId ? undefined : isNull(emailTemplates.editionId)));
  const own = editionId ? rows.find((r) => r.editionId === editionId) : undefined;
  const global = rows.find((r) => r.editionId === null);
  const hit = own ?? global;
  if (hit) return { subject: hit.subject, body: hit.body, source: own ? 'edition' : 'global', updatedAt: hit.updatedAt };
  const d = TEMPLATE_DEFAULTS[key];
  return { subject: d.subject, body: d.body, source: 'default', updatedAt: null };
}

export type TemplateSummary = { key: TemplateKey; label: string; when: string; wired: boolean; customized: boolean; updatedAt: string | null; editionOverrides: number };

export async function listTemplates(ctx: Ctx): Promise<TemplateSummary[]> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const db = getDb();
  const [globals, overrides] = await Promise.all([
    db.select({ key: emailTemplates.key, updatedAt: emailTemplates.updatedAt }).from(emailTemplates).where(isNull(emailTemplates.editionId)),
    db.select({ key: emailTemplates.key, n: count() }).from(emailTemplates).where(isNotNull(emailTemplates.editionId)).groupBy(emailTemplates.key),
  ]);
  return TEMPLATE_KEYS.map((key) => {
    const g = globals.find((r) => r.key === key);
    const d = TEMPLATE_DEFAULTS[key];
    return { key, label: d.label, when: d.when, wired: d.wired, customized: !!g, updatedAt: g?.updatedAt.toISOString() ?? null, editionOverrides: overrides.find((o) => o.key === key)?.n ?? 0 };
  });
}

export const TemplateInput = z
  .object({
    key: z.string().refine(isTemplateKey, 'Modello sconosciuto.'),
    /** Slug dell'edizione, o null per il modello di tutte le edizioni. */
    edition: z.string().min(1).nullable(),
    subject: z.string().trim().min(3, 'Scrivi l’oggetto.').max(200),
    body: z.string().trim().min(10, 'Scrivi il testo dell’email.').max(5000),
  })
  .superRefine((v, c) => {
    const unknown = unknownVariables(`${v.subject}\n${v.body}`);
    if (unknown.length) c.addIssue({ code: 'custom', path: ['body'], message: `Variabile sconosciuta: {{${unknown[0]}}}. Usa quelle dell’elenco.` });
  });

async function editionFor(slug: string | null, opts: { forWrite: boolean }) {
  if (!slug) return null;
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  if (opts.forWrite && e.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
  return e;
}

/** Salva il modello (globale o dell'edizione). Nel registro oggetto e lunghezza del testo. */
export async function saveTemplate(ctx: Ctx, input: z.input<typeof TemplateInput>): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const data = TemplateInput.parse(input);
  const edition = await editionFor(data.edition, { forWrite: true });
  const now = new Date();
  await withTransaction(async (tx) => {
    await tx
      .insert(emailTemplates)
      .values({ key: data.key, editionId: edition?.id ?? null, subject: data.subject, body: data.body, updatedBy: ctx.user?.id ?? null })
      .onConflictDoUpdate({ target: [emailTemplates.key, emailTemplates.editionId], set: { subject: data.subject, body: data.body, updatedBy: ctx.user?.id ?? null, updatedAt: now } });
    await audit(tx, ctx, 'email_template.saved', { entityType: 'email_template', entityId: data.key, edition: edition?.slug ?? null, after: { subject: data.subject, bodyLength: data.body.length } });
  });
}

/** Torna al modello predefinito (o a quello globale, per un'edizione): toglie la versione modificata. */
export async function resetTemplate(ctx: Ctx, input: { key: string; edition: string | null }): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  if (!isTemplateKey(input.key)) throw new DomainError('VALIDATION');
  const edition = await editionFor(input.edition, { forWrite: true });
  await withTransaction(async (tx) => {
    await tx.delete(emailTemplates).where(and(eq(emailTemplates.key, input.key), edition ? eq(emailTemplates.editionId, edition.id) : isNull(emailTemplates.editionId)));
    await audit(tx, ctx, 'email_template.reset', { entityType: 'email_template', entityId: input.key, edition: edition?.slug ?? null });
  });
}

const myTicketsUrl = (token: string) => `${siteUrl()}/i-miei-biglietti/${token}`;

/** Variabili di un ordine. Contengono dati personali: solo per l'email del cliente e l'anteprima in admin. */
export function varsForOrder(o: MyOrder, extra: TemplateVars = {}): TemplateVars {
  const when = o.session ? formatDateTime(o.session.startsAt) : o.edition.startsAt ? formatDateTime(o.edition.startsAt) : '';
  return {
    'cliente.nome': o.customer?.name?.split(' ')[0] ?? '',
    'ordine.codice': o.code,
    'ordine.totale': formatMoney(o.totalCents),
    'ordine.link': myTicketsUrl(o.accessToken),
    'sessione.data': when,
    'edizione.titolo': o.edition.title,
    'edizione.luogo': o.edition.location ?? '',
    'pagamento.link': myTicketsUrl(o.accessToken),
    'avviso.link': `${siteUrl()}/acquista/${o.edition.slug}`,
    ...extra,
  };
}

export async function orderForTemplate(orderId: string): Promise<MyOrder | null> {
  const [row] = await getDb().select({ token: ordersV2.accessToken }).from(ordersV2).where(eq(ordersV2.id, orderId));
  return row ? getOrderByToken(row.token) : null;
}

/** Ordini recenti per la tendina dell'anteprima: solo codice ed edizione. */
export async function previewOrders(ctx: Ctx): Promise<Array<{ id: string; code: string; edition: string }>> {
  if (!can(ctx, 'settings.manage') || !can(ctx, 'orders.read')) return [];
  return getDb()
    .select({ id: ordersV2.id, code: ordersV2.code, edition: editions.title })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .where(isNull(ordersV2.deletedAt))
    .orderBy(desc(ordersV2.createdAt))
    .limit(30);
}

/** Variabili per l'anteprima: dall'ordine scelto (se chi guarda può leggere gli ordini) o d'esempio. */
export async function previewVars(ctx: Ctx, orderId: string | null): Promise<TemplateVars> {
  if (!orderId || !can(ctx, 'orders.read')) return exampleVars();
  const o = await orderForTemplate(orderId);
  return o ? { ...exampleVars(), ...varsForOrder(o) } : exampleVars();
}

/** Email completa di un modello diverso dalla conferma (layout semplice). */
export async function renderTemplateEmail(key: TemplateKey, editionId: string | null, vars: TemplateVars, draft?: { subject: string; body: string }) {
  const t = draft ?? (await resolveTemplate(key, editionId));
  return renderLayoutEmail(key, t, vars);
}
