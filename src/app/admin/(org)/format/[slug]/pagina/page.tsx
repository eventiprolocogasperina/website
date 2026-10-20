import { notFound } from 'next/navigation';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { BlockEditor } from '@/components/admin/page-editor/BlockEditor';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { isDomainError } from '@/server/domain/errors';
import { getSeriesEditor } from '@/server/domain/pages';
import { saveSeriesPageAction } from '../../actions';

export const metadata = { title: 'Pagina del format' };

type Props = { params: Promise<{ slug: string }> };

/** Pagina "fuori stagione" del format (§13.3): si vede su /<format> quando nessuna edizione è in stagione. */
export default async function FormatPageEditor({ params }: Props) {
  const denied = await pageDenied('editions.edit');
  if (denied) return denied;
  const { slug } = await params;
  const state = await getSeriesEditor((await getAdminCtx())!, slug).catch((e) => {
    if (isDomainError(e) && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  return (
    <AdminPage>
      <BlockEditor
        title={`Pagina di ${state.title}`}
        subtitle={state.publicUrl ? `Fuori stagione su ${state.publicUrl}: quando un’edizione è pubblicata o in vendita, lì si vede la pagina dell’edizione.` : 'Il format non ha una pagina pubblica: impostala in Format.'}
        back={{ href: '/admin/format', label: 'Format' }}
        pageKey={slug}
        initialBlocks={state.blocks}
        isDefault={state.isDefault}
        version={state.version}
        data={state.data}
        theme={state.theme}
        publicUrl={state.publicUrl}
        readOnly={state.readOnly}
        save={saveSeriesPageAction}
      />
    </AdminPage>
  );
}
