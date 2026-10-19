import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { signLinkToken, signToken, verifyLinkToken, verifyToken } from './token';
import { hashPassword, isValidPin, passwordFingerprint, verifyPassword } from './password';
import { isRateLimited, recordFailure } from './rateLimit';
import { proxy } from '../../proxy';

const SECRET = 'segreto-di-prova-abbastanza-lungo';
const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

describe('token di sessione', () => {
  it('accetta un token valido', () => {
    const t = signToken({ sub: 'admin', role: 'admin', exp: inOneHour() }, SECRET);
    expect(verifyToken(t, SECRET)?.sub).toBe('admin');
  });

  it('rifiuta un token manomesso', () => {
    const t = signToken({ sub: 'admin', role: 'cassa', eventId: 'a', exp: inOneHour() }, SECRET);
    const [, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin', exp: inOneHour() })).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyToken(t.slice(0, -2) + 'xx', SECRET)).toBeNull();
  });

  it('rifiuta un token firmato con un altro segreto', () => {
    const t = signToken({ sub: 'admin', role: 'admin', exp: inOneHour() }, 'altro-segreto');
    expect(verifyToken(t, SECRET)).toBeNull();
  });

  it('rifiuta un token scaduto', () => {
    const t = signToken({ sub: 'admin', role: 'admin', exp: Math.floor(Date.now() / 1000) - 1 }, SECRET);
    expect(verifyToken(t, SECRET)).toBeNull();
  });

  it('rifiuta token vuoti o senza segreto', () => {
    expect(verifyToken(undefined, SECRET)).toBeNull();
    expect(verifyToken('abc', SECRET)).toBeNull();
    expect(verifyToken(signToken({ sub: 'a', role: 'admin', exp: inOneHour() }, SECRET), '')).toBeNull();
  });
});

describe('link firmati', () => {
  it('valgono una volta per impronta e scadono', () => {
    const t = signLinkToken({ p: 'reset', uid: 'u1', fp: 'abc', exp: inOneHour() }, SECRET);
    expect(verifyLinkToken(t, SECRET)?.uid).toBe('u1');
    expect(verifyLinkToken(t, 'altro')).toBeNull();
    expect(verifyLinkToken(signLinkToken({ p: 'reset', uid: 'u1', fp: 'abc', exp: 1 }, SECRET), SECRET)).toBeNull();
    // Un token di sessione non vale come link e viceversa.
    expect(verifyToken(t, SECRET)).toBeNull();
    expect(verifyLinkToken(signToken({ sub: 'u1', role: 'admin', exp: inOneHour() }, SECRET), SECRET)).toBeNull();
  });

  it('l\'impronta cambia quando cambia la password', () => {
    expect(passwordFingerprint(hashPassword('prima-password'))).not.toBe(passwordFingerprint(hashPassword('prima-password')));
    expect(passwordFingerprint(null)).toBe(passwordFingerprint(null));
  });
});

describe('PIN', () => {
  it('accetta da 4 a 6 cifre', () => {
    expect(['1234', '123456'].every(isValidPin)).toBe(true);
    expect(['123', '1234567', '12a4', ''].some(isValidPin)).toBe(false);
  });
});

describe('password', () => {
  it('verifica la password giusta e rifiuta quella sbagliata', () => {
    const hash = hashPassword('una-password-lunga');
    expect(verifyPassword('una-password-lunga', hash)).toBe(true);
    expect(verifyPassword('sbagliata', hash)).toBe(false);
    expect(verifyPassword('una-password-lunga', undefined)).toBe(false);
  });
});

describe('limite tentativi', () => {
  it('blocca dopo 5 errori', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key)).toBe(false);
      recordFailure(key);
    }
    expect(isRateLimited(key)).toBe(true);
  });
});

describe('proxy', () => {
  process.env.AUTH_SECRET = SECRET;
  const req = (path: string, method = 'GET', cookie?: string) =>
    new NextRequest(`http://localhost:3000${path}`, { method, headers: cookie ? { cookie } : {} });

  it('una rotta API admin senza cookie risponde 401', async () => {
    const res = proxy(req('/api/admin/orders'));
    expect(res.status).toBe(401);
  });

  it('una pagina admin senza cookie va al login', () => {
    const res = proxy(req('/admin/ordini?x=1'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fadmin%2Fordini%3Fx%3D1');
  });

  it('una sessione di cassa non apre l\'admin', () => {
    const t = signToken({ sub: 'cassa', role: 'cassa', eventId: 'e', exp: inOneHour() }, SECRET);
    expect(proxy(req('/api/admin/orders', 'GET', `pl_admin=${t}`)).status).toBe(401);
  });

  it('con una sessione utente valida lascia passare', () => {
    const t = signToken({ sub: 'u1', sid: 's1', role: 'admin', exp: inOneHour() }, SECRET);
    const res = proxy(req('/api/admin/orders', 'GET', `pl_admin=${t}`));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('l\'accesso di emergenza vale solo con ALLOW_LEGACY_ADMIN=true', () => {
    const t = signToken({ sub: 'admin', role: 'admin', exp: inOneHour() }, SECRET);
    delete process.env.ALLOW_LEGACY_ADMIN;
    expect(proxy(req('/api/admin/orders', 'GET', `pl_admin=${t}`)).status).toBe(401);
    process.env.ALLOW_LEGACY_ADMIN = 'true';
    expect(proxy(req('/api/admin/orders', 'GET', `pl_admin=${t}`)).headers.get('x-middleware-next')).toBe('1');
    delete process.env.ALLOW_LEGACY_ADMIN;
  });

  it('lo scanner si apre con un dispositivo abbinato, senza dispositivo va al login', () => {
    expect(proxy(req('/scanner', 'GET', 'pl_device=qualcosa')).headers.get('x-middleware-next')).toBe('1');
    expect(proxy(req('/scanner')).status).toBe(307);
    // Il cookie del dispositivo non apre l'admin.
    expect(proxy(req('/admin', 'GET', 'pl_device=qualcosa')).status).toBe(307);
  });

  it('una sessione PIN non apre l\'admin', () => {
    const t = signToken({ sub: 'u1', role: 'pin', did: 'd1', exp: inOneHour() }, SECRET);
    expect(proxy(req('/api/admin/orders', 'GET', `pl_admin=${t}`)).status).toBe(401);
  });

  it('la lettura degli sponsor resta pubblica, la modifica no', () => {
    expect(proxy(req('/api/admin/sponsors')).headers.get('x-middleware-next')).toBe('1');
    expect(proxy(req('/api/admin/sponsors', 'POST')).status).toBe(401);
  });
});
