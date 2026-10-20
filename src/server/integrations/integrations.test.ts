// Firma del webhook di Meta, numeri WhatsApp, stati dal webhook e testo degli allarmi di errore.
import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { maskPhone, statusesOf, toWhatsappNumber, verifyMetaSignature } = await import('./whatsapp');
const { alertKey, alertMessage } = await import('@/server/alerts');

describe('WhatsApp', () => {
  const body = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.1', status: 'delivered' }, { id: 'wamid.2', status: 'failed', errors: [{ code: 131026, title: 'Undeliverable' }] }] } }] }] });
  const sign = (b: string, secret = 'segreto') => `sha256=${createHmac('sha256', secret).update(b).digest('hex')}`;

  it('accetta solo la firma giusta dell’App Secret', () => {
    expect(verifyMetaSignature(body, sign(body), 'segreto')).toBe(true);
    expect(verifyMetaSignature(body, sign(body, 'altro'), 'segreto')).toBe(false);
    expect(verifyMetaSignature(`${body} `, sign(body), 'segreto')).toBe(false);
    expect(verifyMetaSignature(body, null, 'segreto')).toBe(false);
    expect(verifyMetaSignature(body, sign(body), undefined)).toBe(false);
  });
  it('normalizza i numeri italiani e li maschera', () => {
    expect(toWhatsappNumber('+39 333 123 4567')).toBe('393331234567');
    expect(toWhatsappNumber('3331234567')).toBe('393331234567');
    expect(toWhatsappNumber('0039 333 1234567')).toBe('393331234567');
    expect(toWhatsappNumber('123')).toBe('');
    expect(maskPhone('393331234567')).toBe('***567');
  });
  it('legge gli stati dal webhook', () => {
    expect(statusesOf(JSON.parse(body))).toEqual([
      { id: 'wamid.1', status: 'delivered', error: null },
      { id: 'wamid.2', status: 'failed', error: '131026 Undeliverable' },
    ]);
    expect(statusesOf({})).toEqual([]);
  });
});

describe('allarmi di errore', () => {
  const ctx = { code: 'ZK26-7F3K', email: 'mario.rossi@example.com', name: 'Mario Rossi', error: Object.assign(new Error('violazione per mario.rossi@example.com'), { code: 'CONFLICT' }) };
  it('raggruppa per testo e codice dell’errore', () => {
    expect(alertKey('Pagamento fallito', ctx)).toBe('Pagamento fallito · CONFLICT');
    expect(alertKey('Pagamento fallito', { error: new TypeError('x') })).toBe('Pagamento fallito · TypeError');
  });
  it('nel messaggio nessun dato personale, solo campi tecnici e il link ai log', () => {
    const m = alertMessage('Pagamento fallito', ctx, { suppressed: 3, logsUrl: 'https://vercel.com/x/logs', env: 'production' });
    expect(m).toContain('ZK26-7F3K');
    expect(m).toContain('+3 dello stesso tipo');
    expect(m).toContain('https://vercel.com/x/logs');
    expect(m).not.toMatch(/mario|rossi|example\.com/i);
  });
});
