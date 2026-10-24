import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { listTemplates } from '@/server/domain/email-templates';
import { listEmailLog, EMAIL_LOG_PAGE } from '@/server/domain/email-templates/log';
import { EmailLogClient } from './EmailLogClient';
import { TemplateList } from './TemplateList';

export const metadata = { title: 'Email' };

type Search = { vista?: string; modello?: string; esito?: string; pagina?: string };

/** Sistema → Email (§10.3): modelli con anteprima e registro degli invii. Sostituisce /admin/email-preview. */
export default async function EmailPage({ searchParams }: { searchParams: Promise<Search> }) {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const sp = await searchParams;
  const logView = sp.vista === 'registro';
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1);
  return (
    <AdminPage wide={logView}>
      <PageHeader title="Email" subtitle="I testi delle email ai clienti e il registro di quelle inviate. Una modifica vale dall’invio successivo, senza deploy." />
      <nav aria-label="Viste" className="mb-4 flex gap-1 border-b border-border">
        {[
          { href: '/admin/sistema/email', label: 'Modelli', on: !logView },
          { href: '/admin/sistema/email?vista=registro', label: 'Registro invii', on: logView },
        ].map((t) => (
          <a key={t.href} href={t.href} aria-current={t.on ? 'page' : undefined} className={`-mb-px border-b-2 px-3 py-2 text-body ${t.on ? 'border-primary font-medium text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
            {t.label}
          </a>
        ))}
      </nav>
      {logView ? (
        <EmailLogClient
          {...await listEmailLog(ctx, { template: sp.modello?.slice(0, 40), status: sp.esito?.slice(0, 20), page })}
          page={page - 1}
          pageSize={EMAIL_LOG_PAGE}
          filters={{ modello: sp.modello ?? '', esito: sp.esito ?? '' }}
        />
      ) : (
        <TemplateList templates={await listTemplates(ctx)} />
      )}
    </AdminPage>
  );
}
