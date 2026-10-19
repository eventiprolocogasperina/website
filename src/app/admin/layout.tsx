import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/shell/AdminShell';
import { log } from '@/server/log';
import { getAdminCtx } from '@/server/auth/context';
import { can, editionPermissions, orgPermissions } from '@/server/auth/permissions';
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
  // Il proxy controlla solo la firma del cookie: qui si verifica che la sessione sia ancora aperta.
  const ctx = await getAdminCtx();
  if (!ctx) redirect('/login?next=/admin');

  const [allEditions, counts] = await Promise.all([
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
  const access = {
    org: orgPermissions(ctx),
    editions: Object.fromEntries(allEditions.map((e) => [e.slug, editionPermissions(ctx, e.slug)])),
  };
  const visibleCounts: TodoCounts = {
    refunds: can(ctx, 'orders.read') ? counts.refunds : 0,
    photos: can(ctx, 'photos.moderate') || can(ctx, 'photos.moderate', { edition: 'zuccaland-2026' }) ? counts.photos : 0,
    stalePending: can(ctx, 'orders.read') ? counts.stalePending : 0,
  };
  const editions = allEditions.filter((e) => access.editions[e.slug].length > 0);
  const user = ctx.legacy ? { name: 'Accesso di emergenza', email: null, legacy: true } : { name: ctx.user?.name ?? '', email: ctx.user?.email ?? null, legacy: false };
  return (
    <AdminShell editions={editions} counts={visibleCounts} cookieEdition={cookieEdition} user={user} access={access}>
      {children}
    </AdminShell>
  );
}
