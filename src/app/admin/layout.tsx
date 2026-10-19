import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/shell/AdminShell';
import { log } from '@/server/log';
import { getTodoCounts, type TodoCounts } from '@/server/admin/todo';
import { EDITION_COOKIE, listEditions, type EditionSummary } from '@/server/domain/editions';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin Pro Loco Gasperina' },
  robots: { index: false, follow: false },
};

const NO_COUNTS: TodoCounts = { refunds: 0, photos: 0, stalePending: 0 };

// L'accesso è verificato prima di arrivare qui (src/proxy.ts) e di nuovo da requireAdmin nelle rotte API.
// Se il database non risponde la shell resta in piedi: le pagine mostrano il loro errore.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [editions, counts] = await Promise.all([
    listEditions().catch((error: unknown): EditionSummary[] => {
      log.error('admin.shell.editions_failed', { error });
      return [];
    }),
    getTodoCounts().catch((error: unknown) => {
      log.error('admin.shell.counts_failed', { error });
      return NO_COUNTS;
    }),
  ]);
  const cookieEdition = (await cookies()).get(EDITION_COOKIE)?.value ?? null;
  return (
    <AdminShell editions={editions} counts={counts} cookieEdition={cookieEdition}>
      {children}
    </AdminShell>
  );
}
