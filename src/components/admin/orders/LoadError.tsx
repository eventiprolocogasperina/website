import { AdminPage } from '@/components/admin/shell/AdminPage';
import { ErrorState, PageHeader } from '@/components/ui';

/** Pagina con lo stato di errore (§11.6) quando il server non riesce a leggere i dati. */
export function LoadError({ title, what }: { title?: string; what: string }) {
  return (
    <AdminPage>
      {title && <PageHeader title={title} />}
      <div className="rounded-xl border border-border bg-surface">
        <ErrorState message={`Non riesco a caricare ${what}. Ricarica la pagina tra poco.`} />
      </div>
    </AdminPage>
  );
}
