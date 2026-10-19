import { Archive, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { editionNav } from '@/components/admin/shell/nav.config';
import { Card, cn, focusRing, PageHeader, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';

export async function generateMetadata(props: EditionParams) {
  return { title: (await editionFromParams(props)).title };
}

/** Panoramica dell'edizione. I numeri arrivano con il prompt 10; per ora stato e scorciatoie. */
export default async function EditionOverviewPage(props: EditionParams) {
  const edition = await editionFromParams(props);
  const sections = editionNav(edition.slug, edition.modules)
    .flatMap((g) => g.items)
    .filter((i) => i.href !== `/admin/e/${edition.slug}`);

  return (
    <AdminPage>
      <PageHeader title={edition.title} badge={<StatusBadge status={edition.status} />} subtitle={edition.startsOn ? formatDate(edition.startsOn) : 'Data da definire'} />
      {edition.status === 'archived' && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-body text-muted">
          <Archive size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>Edizione archiviata: i dati restano consultabili ma non si modificano.</span>
        </div>
      )}
      <Card title="Sezioni" flush>
        <ul className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          {sections.map(({ href, label, icon: Icon }) => (
            <li key={href} className="sm:border-b sm:border-border sm:odd:border-r">
              <Link href={href} className={cn('flex items-center gap-3 px-4 py-3 text-body text-fg hover:bg-surface-sunken', focusRing)}>
                <Icon size={18} aria-hidden className="shrink-0 text-muted" />
                <span className="flex-1">{label}</span>
                <ArrowRight size={16} aria-hidden className="text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </AdminPage>
  );
}
