import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { signToken, verifyToken } from './token';
import { hashPassword, verifyPassword } from './password';
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

  it('con una sessione admin valida lascia passare', () => {
    const t = signToken({ sub: 'admin', role: 'admin', exp: inOneHour() }, SECRET);
    const res = proxy(req('/api/admin/orders', 'GET', `pl_admin=${t}`));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('la lettura degli sponsor resta pubblica, la modifica no', () => {
    expect(proxy(req('/api/admin/sponsors')).headers.get('x-middleware-next')).toBe('1');
    expect(proxy(req('/api/admin/sponsors', 'POST')).status).toBe(401);
  });
});
