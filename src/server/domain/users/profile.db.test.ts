// Profilo personale su un Postgres vero: ognuno imposta il proprio PIN (quello da responsabile per gli
// annulli in cassa), che sblocca un PIN bloccato; senza utente (codice di oggi, dispositivo) non si può.
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { verifyPassword } from '@/server/auth/password';
import { users } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { owner } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { createUser, getOwnProfile, setOwnPin } from '.';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('profilo e PIN personale', () => {
  afterAll(() => closeTestDb());

  it('il responsabile imposta il proprio PIN, anche se era bloccato', async () => {
    const { id } = await createUser(owner, { name: 'Mario Responsabile', email: `resp-${Date.now()}@example.com`, roles: [{ role: 'event_manager', edition: null }] }, { invite: false });
    await getDb().update(users).set({ pinLockedAt: new Date(), pinFailedAttempts: 5 }).where(eq(users.id, id));
    const me: Ctx = { user: { id, name: 'Mario Responsabile', email: null }, device: null, legacy: false, grants: [{ role: 'event_manager', edition: null }], ip: null };
    expect(await getOwnProfile(me)).toMatchObject({ hasPin: false, pinLocked: true });
    await setOwnPin(me, '4821');
    const [row] = await getDb().select().from(users).where(eq(users.id, id));
    expect(verifyPassword('4821', row.pinHash!)).toBe(true);
    expect(row.pinLockedAt).toBeNull();
    expect(await getOwnProfile(me)).toMatchObject({ hasPin: true, pinLocked: false });
  });

  it('senza un utente o con un PIN non valido si rifiuta', async () => {
    await expect(setOwnPin(owner, '1234')).rejects.toBeInstanceOf(DomainError);
    const me: Ctx = { ...owner, user: { id: '00000000-0000-0000-0000-000000000000', name: 'X', email: null } };
    await expect(setOwnPin(me, '12')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
