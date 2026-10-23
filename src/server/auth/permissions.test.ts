import { describe, expect, it } from 'vitest';
import { can, canSomewhere, editionsWith, orgPermissions, PERMISSIONS, type Permission } from './permissions';
import { USER_ROLES, type UserRole } from './roles';

// La tabella del §8.3 ricopiata a mano, colonna per colonna: owner admin event_manager editor cashier gate.
// Se cambia la matrice in permissions.ts senza cambiare qui (o viceversa), i test falliscono.
const TABLE: Record<Permission, string> = {
  'users.manage': '✔-----',
  'settings.payments': '✔-----',
  'settings.manage': '✔✔----',
  'audit.read': '✔✔----',
  'editions.create': '✔✔----',
  'editions.archive': '✔✔----',
  'editions.edit': '✔✔✔---',
  'catalog.edit': '✔✔✔---',
  'modules.manage': '✔✔✔---',
  'orders.read': '✔✔✔---',
  'orders.edit': '✔✔✔---',
  'orders.cancel': '✔✔✔---',
  'orders.resend': '✔✔✔---',
  'orders.refund': '✔✔✔---',
  'refunds.view_iban': '✔✔----',
  'customers.read': '✔✔----',
  'members.manage': '✔✔----',
  'content.edit': '✔✔-✔--',
  'photos.moderate': '✔✔✔✔--',
  'reviews.moderate': '✔✔✔✔--',
  'pos.sell': '✔✔✔-✔-',
  'pos.open_close_session': '✔✔✔-✔-',
  'pos.void': '✔✔✔---',
  'pos.open_amount': '✔✔✔-✔-',
  'pos.complimentary': '✔✔✔-✔-',
  'pos.view_totals': '✔✔✔-✔-',
  'pos.reprint': '✔✔✔-✔-',
  'checkin.scan': '✔✔✔--✔',
  'checkin.revert': '✔✔✔--✔',
  'checkin.search': '✔✔✔--✔',
  'checkin.stats': '✔✔✔--✔',
  'reports.export': '✔✔✔---',
  'costs.read': '✔✔✔---',
  'costs.write': '✔✔✔---',
  'inventory.read': '✔✔✔---',
  'inventory.write': '✔✔----',
};

const ZK = 'zuccaland-2026';
const OTHER = 'assaggia-e-passeggia-2026';

describe('matrice §8.3', () => {
  it('copre tutti i permessi', () => {
    expect(Object.keys(TABLE).sort()).toEqual([...PERMISSIONS].sort());
  });

  for (const permission of PERMISSIONS) {
    describe(permission, () => {
      USER_ROLES.forEach((role: UserRole, i) => {
        const expected = [...TABLE[permission]][i] === '✔';
        it(`${role}: ${expected ? 'sì' : 'no'} (ruolo sull'associazione, su qualunque edizione)`, () => {
          const subject = { grants: [{ role, edition: null }] };
          expect(can(subject, permission)).toBe(expected);
          expect(can(subject, permission, { edition: ZK })).toBe(expected);
        });
        it(`${role}: ${expected ? 'sì' : 'no'} solo sull'edizione assegnata`, () => {
          const subject = { grants: [{ role, edition: ZK }] };
          expect(can(subject, permission, { edition: ZK })).toBe(expected);
          expect(can(subject, permission, { edition: OTHER })).toBe(false);
          expect(can(subject, permission)).toBe(false);
        });
      });
    });
  }
});

describe('costi e inventario', () => {
  it('l’event_manager di un’edizione scrive i costi di quella, non i costi generali né di altre edizioni', () => {
    const em = { grants: [{ role: 'event_manager' as const, edition: ZK }] };
    expect(can(em, 'costs.write', { edition: ZK })).toBe(true);
    expect(can(em, 'costs.write', { edition: OTHER })).toBe(false);
    expect(can(em, 'costs.write')).toBe(false);
  });

  it('l’event_manager legge l’inventario ma non lo modifica', () => {
    const em = { grants: [{ role: 'event_manager' as const, edition: ZK }] };
    expect(canSomewhere(em, 'inventory.read')).toBe(true);
    expect(can(em, 'inventory.read', { edition: ZK })).toBe(true);
    expect(canSomewhere(em, 'inventory.write')).toBe(false);
  });

  it('owner e admin gestiscono costi generali e inventario', () => {
    for (const role of ['owner', 'admin'] as const) {
      const s = { grants: [{ role, edition: null }] };
      expect(orgPermissions(s)).toEqual(expect.arrayContaining(['costs.read', 'costs.write', 'inventory.read', 'inventory.write']));
    }
  });
});

describe('casi del prompt 07', () => {
  it('un editor non vede Vendite né Clienti', () => {
    const editor = { grants: [{ role: 'editor' as const, edition: null }] };
    expect(can(editor, 'orders.read')).toBe(false);
    expect(can(editor, 'customers.read')).toBe(false);
    expect(orgPermissions(editor)).toEqual(['content.edit', 'photos.moderate', 'reviews.moderate']);
  });

  it('un cassiere di Zuccaland 2026 non apre la cassa di un’altra edizione', () => {
    const cashier = { grants: [{ role: 'cashier' as const, edition: ZK }] };
    expect(can(cashier, 'pos.sell', { edition: ZK })).toBe(true);
    expect(can(cashier, 'pos.sell', { edition: OTHER })).toBe(false);
    expect(canSomewhere(cashier, 'pos.sell')).toBe(true);
    expect(editionsWith(cashier, 'pos.sell')).toEqual([ZK]);
  });

  it('più ruoli si sommano', () => {
    const both = { grants: [{ role: 'editor' as const, edition: null }, { role: 'gate' as const, edition: OTHER }] };
    expect(can(both, 'content.edit')).toBe(true);
    expect(can(both, 'checkin.scan', { edition: OTHER })).toBe(true);
    expect(can(both, 'checkin.scan', { edition: ZK })).toBe(false);
    expect(editionsWith({ grants: [{ role: 'admin', edition: null }] }, 'pos.sell')).toBe('all');
  });

  it('nessun ruolo, nessun permesso', () => {
    expect(orgPermissions({ grants: [] })).toEqual([]);
  });
});
