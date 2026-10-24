import Link from 'next/link';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import AssaggiaArchivePage from '@/components/admin/legacy/AssaggiaArchivePage';
import ZuccalandPageEditor from '@/components/admin/legacy/ZuccalandPageEditor';
import { BlockEditor } from '@/components/admin/page-editor/BlockEditor';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { getEditionEditor, publicV2Enabled } from '@/server/domain/pages';
import { saveEditionPageAction } from './actions';

export const metadata = { title: 'Pagina pubblica' };

/** Editor di oggi delle due pagine che il flag public_v2 non ha ancora sostituito (§18.10). */
const LEGACY_EDITORS: Record<string, () => React.ReactNode> = {
  'zuccaland-2026': () => <ZuccalandPageEditor />,
  'assaggia-e-passeggia-2026': () => <AssaggiaArchivePage />,
};

type Props = EditionParams & { searchParams: Promise<{ editor?: string }> };

export default async function EditionPublicPage(props: Props) {
  const edition = await editionFromParams(props);
  const denied = await pageDenied('editions.edit', { edition: edition.slug });
  if (denied) return denied;
  const legacy: (() => React.ReactNode) | undefined = LEGACY_EDITORS[edition.slug];
  const base = `/admin/e/${edition.slug}/pagina`;
  if (legacy && (await props.searchParams).editor === 'oggi') {
    return (
      <>
        <p className="ui-root mx-auto mb-2 max-w-6xl px-4 pt-4 text-body text-muted">
          Stai modificando la pagina pubblicata oggi.{' '}
          <Link href={base} className="text-primary underline">
            Torna all’editor a blocchi
          </Link>
        </p>
        {legacy()}
      </>
    );
  }
  const [state, v2] = await Promise.all([getEditionEditor((await getAdminCtx())!, edition.slug), publicV2Enabled()]);
  const live = legacy !== undefined && !v2;
  return (
    <AdminPage>
      {live && (
        <p className="mb-4 rounded-lg border border-warning bg-surface px-4 py-3 text-body text-fg">
          Il sito mostra ancora la pagina di oggi su {edition.slug.startsWith('zuccaland') ? '/zuccaland' : '/assaggia-e-passeggia'}: questi blocchi si vedono su {state.publicUrl ?? 'la pagina dell’anno'} e prenderanno il suo posto quando si accende l’interruttore “Pagine nuove del sito” in Format.{' '}
          <Link href={`${base}?editor=oggi`} className="text-primary underline">
            Modifica la pagina di oggi
          </Link>
        </p>
      )}
      <BlockEditor
        title="Pagina pubblica"
        subtitle={edition.title}
        back={{ href: `/admin/e/${edition.slug}`, label: edition.title }}
        pageKey={edition.slug}
        initialBlocks={state.blocks}
        isDefault={state.isDefault}
        version={state.version}
        data={state.data}
        theme={state.theme}
        publicUrl={state.publicUrl}
        readOnly={state.readOnly}
        save={saveEditionPageAction}
      />
    </AdminPage>
  );
}
