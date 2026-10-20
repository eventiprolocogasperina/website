import { AdminPage } from '@/components/admin/shell/AdminPage';
import { Skeleton } from '@/components/ui';

/** Caricamento dell'editor a blocchi: elenco a sinistra, anteprima a destra. */
export function EditorSkeleton() {
  return (
    <AdminPage>
      <Skeleton className="mb-2 h-6 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,400px)_1fr]">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <Skeleton className="h-[60vh] w-full" />
      </div>
    </AdminPage>
  );
}
