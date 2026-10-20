import { notFound } from 'next/navigation';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { listEditions } from '@/server/domain/editions';
import { previewOrders, resolveTemplate } from '@/server/domain/email-templates';
import { isTemplateKey, TEMPLATE_DEFAULTS, VARIABLES } from '@/server/domain/email-templates/defaults';
import { getDb } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { TemplateEditor } from './TemplateEditor';

type Props = { params: Promise<{ key: string }>; searchParams: Promise<{ edizione?: string }> };

export async function generateMetadata({ params }: Props) {
  const { key } = await params;
  return { title: isTemplateKey(key) ? `Email · ${TEMPLATE_DEFAULTS[key].label}` : 'Email' };
}

/** Editor di un modello: testo con variabili, anteprima con un ordine vero, invio di prova, versione per edizione. */
export default async function TemplatePage({ params, searchParams }: Props) {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  const { key } = await params;
  if (!isTemplateKey(key)) notFound();
  const { edizione } = await searchParams;
  const ctx = (await getAdminCtx())!;
  const [edition] = edizione ? await getDb().select({ id: editions.id, slug: editions.slug, status: editions.status }).from(editions).where(eq(editions.slug, edizione)) : [];
  if (edizione && !edition) notFound();
  const [current, global, orders, editionList] = await Promise.all([resolveTemplate(key, edition?.id ?? null), resolveTemplate(key, null), previewOrders(ctx), listEditions()]);
  const def = TEMPLATE_DEFAULTS[key];
  return (
    <AdminPage wide>
      <TemplateEditor
        key={`${key}-${edition?.slug ?? ''}`}
        template={{ key, label: def.label, when: def.when, wired: def.wired }}
        edition={edition ? { slug: edition.slug, readOnly: edition.status === 'archived' } : null}
        initial={{ subject: current.subject, body: current.body }}
        source={edition && current.source !== 'edition' ? 'inherited' : current.source}
        fallback={edition ? { subject: global.subject, body: global.body } : { subject: def.subject, body: def.body }}
        variables={def.variables.map((v) => ({ key: v, label: VARIABLES[v].label }))}
        orders={orders}
        editions={editionList.map((e) => ({ slug: e.slug, title: e.title }))}
        email={ctx.user?.email ?? null}
      />
    </AdminPage>
  );
}
