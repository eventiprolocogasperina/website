import { AdminPage } from '@/components/admin/shell/AdminPage';
import { Skeleton } from '@/components/ui';

/** Scheletro delle pagine elenco (ordini, partecipanti, rimborsi, clienti) mentre il server legge i dati. */
export function ListSkeleton({ title }: { title: string }) {
  return (
    <AdminPage wide>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title font-semibold">{title}</h1>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-9 w-full max-w-lg" />
      <Skeleton className="h-9 w-full max-w-sm" />
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3" aria-busy="true" aria-label="Caricamento">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </AdminPage>
  );
}

/** Scheletro della pagina di dettaglio (ordine, cliente): colonna principale e laterale. */
export function DetailSkeleton() {
  return (
    <AdminPage>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </AdminPage>
  );
}
