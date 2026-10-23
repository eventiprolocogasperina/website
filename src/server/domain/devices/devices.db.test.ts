// Abbinamento dei dispositivi su un Postgres vero (npm run test:db): QR con PIN, ruolo scelto dall'admin,
// PIN solo come hash, 5 tentativi per QR, QR monouso.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { hashToken, randomToken } from '@/server/auth/password';
import { auditLog, devicePairings, devices } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { owner, roleOn } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { checkPairing, completePairing, createPairing, MAX_PAIRING_PIN_ATTEMPTS, newPairingPin } from '.';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorOf(p: Promise<unknown>): Promise<{ code: string; message: string }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return { code: e.code, message: e.message };
    if ((e as { name?: string }).name === 'ZodError') return { code: 'ZOD', message: '' };
    throw e;
  }
  return { code: 'nessun errore', message: '' };
}

const edition = `test-${randomUUID().slice(0, 8)}`;
const wrong = (pin: string) => String((Number(pin) + 1) % 1_000_000).padStart(6, '0');
const pairingRow = async (token: string) => (await getDb().select().from(devicePairings).where(eq(devicePairings.tokenHash, hashToken(token))))[0];

describe('PIN di abbinamento', () => {
  it('ha sempre 6 cifre', () => {
    for (let i = 0; i < 200; i++) expect(newPairingPin()).toMatch(/^\d{6}$/);
  });
});

describe.skipIf(!enabled)('abbinamento dei dispositivi sul database', () => {
  afterAll(async () => {
    await closeTestDb();
  });

  it('solo titolare e amministratori generano il QR; il PIN si salva solo come hash', async () => {
    expect((await errorOf(createPairing(roleOn('event_manager', edition), { name: 'Varco 1', edition, kind: 'scanner' }))).code).toBe('FORBIDDEN');
    const { token, pin } = await createPairing(owner, { name: 'Varco 1', edition, kind: 'scanner' });
    expect(pin).toMatch(/^\d{6}$/);
    const row = await pairingRow(token);
    expect(row.pinHash).toMatch(/^scrypt\./);
    expect(row.pinHash).not.toContain(pin);
    expect(JSON.stringify(await getDb().select().from(auditLog).where(eq(auditLog.entityId, row.id)))).not.toContain(pin);
  });

  it('con il PIN giusto crea il dispositivo con il ruolo scelto; senza o con quello sbagliato no', async () => {
    const { token, pin } = await createPairing(owner, { name: 'Varco 2', edition, kind: 'scanner' });
    expect(await errorOf(completePairing(token, '', null))).toEqual({ code: 'VALIDATION', message: 'PIN sbagliato. Ti restano 4 tentativi.' });
    expect((await errorOf(completePairing(token, wrong(pin), null))).message).toBe('PIN sbagliato. Ti restano 3 tentativi.');
    expect((await pairingRow(token)).pinFailedAttempts).toBe(2);
    expect(await checkPairing(token)).toMatchObject({ kind: 'scanner' });

    const { device, deviceToken } = await completePairing(token, pin, '203.0.113.5');
    expect(device).toMatchObject({ name: 'Varco 2', edition, kind: 'scanner' });
    const [row] = await getDb().select().from(devices).where(eq(devices.id, device.id));
    expect(row.tokenHash).toBe(hashToken(deviceToken));
    // Monouso: lo stesso QR non abbina un secondo telefono.
    expect((await errorOf(completePairing(token, pin, null))).message).toMatch(/non è valido o è scaduto/);
  });

  it('al quinto PIN sbagliato il QR non vale più, nemmeno con il PIN giusto', async () => {
    const { token, pin } = await createPairing(owner, { name: 'Varco 3', edition, kind: 'scanner' });
    for (let i = 1; i < MAX_PAIRING_PIN_ATTEMPTS; i++) await errorOf(completePairing(token, wrong(pin), null));
    expect((await errorOf(completePairing(token, wrong(pin), null))).message).toMatch(/questo QR non vale più/);
    expect(await checkPairing(token)).toBeNull();
    expect((await errorOf(completePairing(token, pin, null))).code).toBe('VALIDATION');
    const row = await pairingRow(token);
    expect(row.usedAt).toBeNull();
    const actions = (await getDb().select().from(auditLog).where(eq(auditLog.entityId, row.id))).map((a) => a.action);
    expect(actions).toContain('device.pairing_blocked');
    expect(actions.filter((a) => a === 'device.pairing_pin_failed')).toHaveLength(MAX_PAIRING_PIN_ATTEMPTS - 1);
  });

  it('un QR creato prima del PIN non si accetta', async () => {
    const token = randomToken();
    await getDb().insert(devicePairings).values({ tokenHash: hashToken(token), name: 'Vecchio', editionSlug: edition, kind: 'pos', expiresAt: new Date(Date.now() + 60_000) });
    expect((await errorOf(completePairing(token, '123456', null))).message).toMatch(/non ha un PIN/);
  });
});
