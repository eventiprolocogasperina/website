import { AdminPage } from '@/components/admin/shell/AdminPage';
import { Skeleton } from '@/components/ui';

/** Forma della pagina Check-in mentre arrivano i numeri. */
export default function Loading() {
  return (
    <AdminPage>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-80" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </AdminPage>
  );
}
