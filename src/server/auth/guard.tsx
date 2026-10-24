import 'server-only';
import type { ReactNode } from 'react';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { ForbiddenState } from '@/components/ui';
import { getAdminCtx } from './context';
import { can, type Permission, type PermissionScope } from './permissions';

/**
 * Per le pagine dell'admin: null se l'utente può vederla, altrimenti la schermata "Non hai accesso".
 *   const denied = await pageDenied('orders.read'); if (denied) return denied;
 * Con più permessi basta averne uno. La sessione è già verificata dal layout.
 */
export async function pageDenied(permission: Permission | Permission[], scope: PermissionScope = {}): Promise<ReactNode | null> {
  const ctx = await getAdminCtx();
  const list = Array.isArray(permission) ? permission : [permission];
  if (ctx && list.some((p) => can(ctx, p, scope))) return null;
  return (
    <AdminPage>
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <ForbiddenState />
      </div>
    </AdminPage>
  );
}
