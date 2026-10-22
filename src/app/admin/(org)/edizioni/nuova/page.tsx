import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { listWizardFormats } from '@/server/domain/editions/setup';
import { NewEditionWizard } from './NewEditionWizard';

export const metadata = { title: 'Nuova edizione' };

/** Procedura guidata, passi 1 e 2: che tipo di evento è, e da dove si parte. Il resto continua nell'edizione. */
export default async function NewEditionPage() {
  const denied = await pageDenied('editions.create');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const formats = await listWizardFormats(ctx);
  return (
    <AdminPage className="max-w-3xl">
      <NewEditionWizard formats={formats} nextYear={new Date().getFullYear() + 1} />
    </AdminPage>
  );
}
