// Matrice dei permessi (ARCHITETTURA §8.3). Funzioni pure: niente database, niente cookie.
import type { UserRole } from './roles';

export const PERMISSIONS = [
  'users.manage',
  'settings.payments',
  'settings.manage',
  'audit.read',
  'editions.create',
  'editions.archive',
  'editions.edit',
  'catalog.edit',
  'modules.manage',
  'orders.read',
  'orders.edit',
  'orders.cancel',
  'orders.resend',
  'orders.refund',
  'refunds.view_iban',
  'customers.read',
  'members.manage',
  'content.edit',
  'photos.moderate',
  'reviews.moderate',
  'pos.sell',
  'pos.open_close_session',
  'pos.void',
  'checkin.scan',
  'checkin.revert',
  'reports.export',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Per ogni permesso, i ruoli che lo hanno. Una riga per riga della tabella del §8.3. */
export const MATRIX: Record<Permission, readonly UserRole[]> = {
  'users.manage': ['owner'],
  'settings.payments': ['owner'],
  'settings.manage': ['owner', 'admin'],
  'audit.read': ['owner', 'admin'],
  'editions.create': ['owner', 'admin'],
  'editions.archive': ['owner', 'admin'],
  'editions.edit': ['owner', 'admin', 'event_manager'],
  'catalog.edit': ['owner', 'admin', 'event_manager'],
  'modules.manage': ['owner', 'admin', 'event_manager'],
  'orders.read': ['owner', 'admin', 'event_manager'],
  'orders.edit': ['owner', 'admin', 'event_manager'],
  'orders.cancel': ['owner', 'admin', 'event_manager'],
  'orders.resend': ['owner', 'admin', 'event_manager'],
  'orders.refund': ['owner', 'admin', 'event_manager'],
  'refunds.view_iban': ['owner', 'admin'],
  'customers.read': ['owner', 'admin'],
  'members.manage': ['owner', 'admin'],
  'content.edit': ['owner', 'admin', 'editor'],
  'photos.moderate': ['owner', 'admin', 'event_manager', 'editor'],
  'reviews.moderate': ['owner', 'admin', 'event_manager', 'editor'],
  'pos.sell': ['owner', 'admin', 'event_manager', 'cashier'],
  'pos.open_close_session': ['owner', 'admin', 'event_manager', 'cashier'],
  'pos.void': ['owner', 'admin', 'event_manager'],
  'checkin.scan': ['owner', 'admin', 'event_manager', 'gate'],
  'checkin.revert': ['owner', 'admin', 'event_manager', 'gate'],
  'reports.export': ['owner', 'admin', 'event_manager'],
};

/** Ruoli che valgono solo sulle edizioni assegnate (nota ¹ del §8.3). */
export const EDITION_SCOPED_ROLES: readonly UserRole[] = ['event_manager', 'cashier', 'gate'];

export type RoleGrant = { role: UserRole; /** null = tutta l'associazione */ edition: string | null };

/**
 * Il minimo che serve per decidere: i ruoli di chi agisce.
 * Gli event_manager, cashier e gate assegnati a tutta l'associazione valgono su ogni edizione.
 */
export type PermissionSubject = { grants: readonly RoleGrant[] };

export type PermissionScope = {
  /** Edizione su cui si agisce (slug). Senza, contano solo i ruoli dell'associazione. */
  edition?: string | null;
};

function grantApplies(grant: RoleGrant, scope: PermissionScope) {
  if (grant.edition === null) return true;
  return !!scope.edition && grant.edition === scope.edition;
}

/**
 * true se almeno un ruolo concede il permesso nell'ambito indicato.
 * Un ruolo assegnato a un'edizione vale solo per quell'edizione: senza `edition` nello scope
 * (pagine e API dell'associazione) non conta.
 */
export function can(subject: PermissionSubject, permission: Permission, scope: PermissionScope = {}): boolean {
  const roles = MATRIX[permission];
  return subject.grants.some((g) => roles.includes(g.role) && grantApplies(g, scope));
}

/** true se il permesso vale su almeno un'edizione: serve a mostrare le voci di menu del livello Edizione. */
export function canSomewhere(subject: PermissionSubject, permission: Permission): boolean {
  const roles = MATRIX[permission];
  return subject.grants.some((g) => roles.includes(g.role));
}

/** Le edizioni su cui vale un permesso; `'all'` se vale su tutta l'associazione. */
export function editionsWith(subject: PermissionSubject, permission: Permission): 'all' | string[] {
  const roles = MATRIX[permission];
  const grants = subject.grants.filter((g) => roles.includes(g.role));
  if (grants.some((g) => g.edition === null)) return 'all';
  return [...new Set(grants.map((g) => g.edition as string))];
}

/** Permessi validi a livello di associazione, per l'interfaccia (il client riceve solo questa lista). */
export function orgPermissions(subject: PermissionSubject): Permission[] {
  return PERMISSIONS.filter((p) => can(subject, p));
}

/** Permessi validi su un'edizione. */
export function editionPermissions(subject: PermissionSubject, edition: string): Permission[] {
  return PERMISSIONS.filter((p) => can(subject, p, { edition }));
}
