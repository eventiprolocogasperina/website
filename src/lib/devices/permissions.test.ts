import { describe, expect, it } from 'vitest';
import { deviceCtx, type CtxDevice } from '@/server/auth/context-shared';
import { can, PERMISSIONS } from '@/server/auth/permissions';
import { DEVICE_PERMISSIONS, DEVICE_PRESETS, effectiveDevicePermissions, roleDefaultPermissions, validateDevicePermissions } from './permissions';

const ED = 'zuccaland-2026';
const device = (over: Partial<CtxDevice>): CtxDevice => ({ id: 'd1', name: 'Cassa 1', edition: ED, kind: 'pos', ...over });

describe('permessi dei dispositivi', () => {
  it('le caselle sono permessi veri della matrice', () => {
    for (const list of Object.values(DEVICE_PERMISSIONS)) for (const p of list) expect(PERMISSIONS).toContain(p.permission);
  });

  it('i preset usano solo chiavi del loro ruolo', () => {
    for (const preset of DEVICE_PRESETS) expect(validateDevicePermissions(preset.kind, preset.permissions)).toEqual({ ok: true, permissions: preset.permissions });
  });

  it('senza permessi salvati valgono quelli del ruolo, come prima', () => {
    expect(roleDefaultPermissions('pos')).toEqual(['pos.sell', 'pos.open_amount', 'pos.complimentary', 'pos.open_close_session', 'pos.view_totals', 'pos.reprint']);
    expect(roleDefaultPermissions('scanner')).toEqual(['checkin.scan', 'checkin.revert', 'checkin.search', 'checkin.stats']);
    expect(effectiveDevicePermissions('pos', null)).toEqual(roleDefaultPermissions('pos'));
  });

  it('rifiuta chiavi di un altro ruolo o inventate, aggiunge quelle obbligatorie e toglie i doppioni', () => {
    expect(validateDevicePermissions('pos', ['checkin.scan'])).toMatchObject({ ok: false });
    expect(validateDevicePermissions('scanner', ['pos.void'])).toMatchObject({ ok: false });
    expect(validateDevicePermissions('pos', ['users.manage'])).toMatchObject({ ok: false });
    expect(validateDevicePermissions('pos', ['pos.reprint', 'pos.reprint'])).toEqual({ ok: true, permissions: ['pos.sell', 'pos.reprint'] });
    expect(validateDevicePermissions('scanner', [])).toEqual({ ok: true, permissions: ['checkin.scan'] });
    expect(validateDevicePermissions('scanner', ['pos.sell'])).toEqual({ ok: true, permissions: ['checkin.scan', 'pos.sell'] });
  });

  it('il contesto del dispositivo ha solo i permessi scelti, solo sulla sua edizione', () => {
    const ctx = deviceCtx(device({ permissions: ['pos.sell', 'pos.void'] }), null);
    expect(ctx.grants).toEqual([]);
    expect(can(ctx, 'pos.sell', { edition: ED })).toBe(true);
    expect(can(ctx, 'pos.void', { edition: ED })).toBe(true);
    expect(can(ctx, 'pos.open_close_session', { edition: ED })).toBe(false);
    expect(can(ctx, 'pos.complimentary', { edition: ED })).toBe(false);
    expect(can(ctx, 'pos.sell', { edition: 'altra' })).toBe(false);
    expect(can(ctx, 'pos.sell')).toBe(false);
  });

  it('un dispositivo abbinato prima dei permessi vale come il ruolo', () => {
    expect(deviceCtx(device({ permissions: null }), null).grants).toEqual([{ role: 'cashier', edition: ED }]);
    const gate = deviceCtx(device({ kind: 'scanner', permissions: undefined }), null);
    expect(gate.grants).toEqual([{ role: 'gate', edition: ED }]);
    expect(can(gate, 'checkin.revert', { edition: ED })).toBe(true);
  });

  it('chiavi salvate non più valide si ignorano, senza togliere le obbligatorie', () => {
    const ctx = deviceCtx(device({ kind: 'scanner', permissions: ['pos.void' as never] }), null);
    expect(can(ctx, 'checkin.scan', { edition: ED })).toBe(true);
    expect(can(ctx, 'pos.void', { edition: ED })).toBe(false);
  });
});
