import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';
import AssaggiaArchivePage from '@/components/admin/legacy/AssaggiaArchivePage';
import ZuccalandPageEditor from '@/components/admin/legacy/ZuccalandPageEditor';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';

export const metadata = { title: 'Pagina pubblica' };

export default async function EditionPublicPage(props: EditionParams) {
  const edition = await editionFromParams(props);
  const denied = await pageDenied('editions.edit', { edition: edition.slug });
  if (denied) return denied;
  if (edition.slug === 'zuccaland-2026') return <ZuccalandPageEditor />;
  if (edition.slug === 'assaggia-e-passeggia-2026') return <AssaggiaArchivePage />;
  return (
    <ComingSoon
      title="Pagina pubblica"
      description="L'editor a blocchi per la pagina di questa edizione."
      when="con la fase 3"
      meanwhile={{ href: '/admin/edizioni', label: 'Modifica la scheda evento' }}
    />
  );
}
