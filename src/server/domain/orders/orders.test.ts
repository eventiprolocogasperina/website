import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/server/domain/errors';
import { allocate, discountProblem, priceCart, type PricingDiscount, type PricingProduct } from '@/server/domain/pricing/cart';
import { derivePaymentStatus, summarizePayments } from '@/server/domain/payments/status';
import { decryptIban, encryptIban, maskIban } from '@/server/domain/refunds/crypto';
import { orderCodePrefix, randomCode, randomToken } from './code';

vi.mock('server-only', () => ({}));

const ED = 'e1';
const product = (over: Partial<PricingProduct> = {}): PricingProduct => ({
  id: 'p1',
  name: 'Ingresso',
  priceCents: 500,
  channels: ['online', 'pos'],
  requiresSession: false,
  active: true,
  department: null,
  minPerOrder: null,
  maxPerOrder: null,
  ...over,
});
const discount = (over: Partial<PricingDiscount> = {}): PricingDiscount => ({
  id: 'd1',
  editionId: null,
  kind: 'percent',
  value: 10,
  maxUses: null,
  usedCount: 0,
  validFrom: null,
  validUntil: null,
  appliesToProductIds: [],
  active: true,
  ...over,
});
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as DomainError).code;
  }
  return 'nessun errore';
};

describe('priceCart (catalogo delle edizioni)', () => {
  const base = { editionId: ED, channel: 'online' as const, sessions: [{ id: 's1', status: 'open' }] };

  it('calcola righe e totale dal listino, unendo le righe uguali', () => {
    const r = priceCart({ ...base, products: [product()], lines: [{ productId: 'p1', quantity: 2 }, { productId: 'p1', quantity: 1 }] });
    expect(r.lines).toHaveLength(1);
    expect(r).toMatchObject({ subtotalCents: 1500, discountCents: 0, totalCents: 1500, discountId: null });
  });

  it('rifiuta carrello vuoto, prodotti sconosciuti, quantità strane', () => {
    expect(code(() => priceCart({ ...base, products: [product()], lines: [] }))).toBe('VALIDATION');
    expect(code(() => priceCart({ ...base, products: [product()], lines: [{ productId: 'x', quantity: 1 }] }))).toBe('VALIDATION');
    for (const quantity of [0, -1, 1.5, 51]) expect(code(() => priceCart({ ...base, products: [product()], lines: [{ productId: 'p1', quantity }] }))).toBe('VALIDATION');
  });

  it('vende solo sui canali del prodotto (l’admin può tutto) e solo prodotti attivi', () => {
    expect(code(() => priceCart({ ...base, channel: 'paylink', products: [product()], lines: [{ productId: 'p1', quantity: 1 }] }))).toBe('SALES_CLOSED');
    expect(code(() => priceCart({ ...base, products: [product({ active: false })], lines: [{ productId: 'p1', quantity: 1 }] }))).toBe('SALES_CLOSED');
    expect(priceCart({ ...base, channel: 'admin', products: [product({ channels: [] })], lines: [{ productId: 'p1', quantity: 1 }] }).totalCents).toBe(500);
  });

  it('chiede la data ai prodotti che la richiedono e controlla che sia in vendita', () => {
    const p = product({ requiresSession: true });
    expect(code(() => priceCart({ ...base, products: [p], lines: [{ productId: 'p1', quantity: 1 }] }))).toBe('VALIDATION');
    expect(code(() => priceCart({ ...base, products: [p], lines: [{ productId: 'p1', quantity: 1, sessionId: 'zz' }] }))).toBe('VALIDATION');
    expect(code(() => priceCart({ ...base, sessions: [{ id: 's1', status: 'sold_out' }], products: [p], lines: [{ productId: 'p1', quantity: 1, sessionId: 's1' }] }))).toBe('SOLD_OUT');
    expect(code(() => priceCart({ ...base, sessions: [{ id: 's1', status: 'closed' }], products: [p], lines: [{ productId: 'p1', quantity: 1, sessionId: 's1' }] }))).toBe('SALES_CLOSED');
    const r = priceCart({ ...base, sessionId: 's1', products: [p], lines: [{ productId: 'p1', quantity: 1 }] });
    expect(r.lines[0].sessionId).toBe('s1');
  });

  it('applica minimo e massimo per ordine sul totale del prodotto', () => {
    const p = product({ minPerOrder: 2, maxPerOrder: 3 });
    expect(code(() => priceCart({ ...base, products: [p], lines: [{ productId: 'p1', quantity: 1 }] }))).toBe('VALIDATION');
    expect(code(() => priceCart({ ...base, products: [p], lines: [{ productId: 'p1', quantity: 4 }] }))).toBe('VALIDATION');
    expect(priceCart({ ...base, products: [p], lines: [{ productId: 'p1', quantity: 2 }] }).totalCents).toBe(1000);
  });

  it('gli inviti sono a 0 € e non accettano codici sconto', () => {
    const p = product({ channels: ['invite'] });
    expect(priceCart({ ...base, channel: 'invite', products: [p], lines: [{ productId: 'p1', quantity: 3 }] }).totalCents).toBe(0);
    expect(code(() => priceCart({ ...base, channel: 'invite', products: [p], lines: [{ productId: 'p1', quantity: 1 }], discount: discount() }))).toBe('DISCOUNT_INVALID');
  });

  it('divide lo sconto tra le righe al centesimo, solo sui prodotti indicati', () => {
    const products = [product(), product({ id: 'p2', name: 'Laboratorio', priceCents: 333 })];
    const lines = [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 },
    ];
    const pct = priceCart({ ...base, products, lines, discount: discount({ value: 10 }) });
    expect(pct.discountCents).toBe(83);
    expect(pct.lines.reduce((s, l) => s + l.discountCents, 0)).toBe(83);
    expect(pct.totalCents).toBe(833 - 83);
    const only = priceCart({ ...base, products, lines, discount: discount({ kind: 'fixed', value: 1000, appliesToProductIds: ['p2'] }) });
    expect(only.lines.map((l) => l.discountCents)).toEqual([0, 333]);
    expect(only.totalCents).toBe(500);
    expect(code(() => priceCart({ ...base, products, lines: [lines[0]], discount: discount({ appliesToProductIds: ['p2'] }) }))).toBe('DISCOUNT_INVALID');
  });

  it('valida lo sconto: attivo, edizione, periodo, utilizzi', () => {
    const now = new Date('2026-10-20T10:00:00Z');
    expect(discountProblem(discount(), ED, now)).toBeNull();
    expect(discountProblem(discount({ active: false }), ED, now)).toBe('non attivo');
    expect(discountProblem(discount({ editionId: 'altra' }), ED, now)).toBe('non valido per questa edizione');
    expect(discountProblem(discount({ validFrom: new Date('2026-11-01') }), ED, now)).toBe('non ancora valido');
    expect(discountProblem(discount({ validUntil: new Date('2026-10-01') }), ED, now)).toBe('scaduto');
    expect(discountProblem(discount({ maxUses: 2, usedCount: 2 }), ED, now)).toBe('esaurito');
  });

  it('allocate restituisce sempre esattamente l’importo', () => {
    expect(allocate(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
    expect(allocate(7, [100, 0, 50]).reduce((a, b) => a + b)).toBe(7);
  });
});

describe('stato di pagamento derivato', () => {
  const ok = (amountCents: number) => ({ status: 'succeeded', amountCents });
  it('pending finché non è coperto, poi paid; i rimborsi lo portano a parziale o totale', () => {
    expect(derivePaymentStatus('pending', 1000, [])).toBe('pending');
    expect(derivePaymentStatus('pending', 1000, [ok(400)])).toBe('pending');
    expect(derivePaymentStatus('pending', 1000, [ok(1000), { status: 'failed', amountCents: 1000 }])).toBe('paid');
    expect(derivePaymentStatus('paid', 1000, [ok(1000)], [{ status: 'paid', amountCents: 300 }])).toBe('partially_refunded');
    expect(derivePaymentStatus('paid', 1000, [ok(1000)], [{ status: 'paid', amountCents: 1000 }])).toBe('refunded');
    expect(derivePaymentStatus('paid', 1000, [ok(1000)], [{ status: 'requested', amountCents: 1000 }])).toBe('paid');
    expect(derivePaymentStatus('pending', 0, [])).toBe('paid');
  });
  it('annullati e scaduti restano tali, anche se arriva un pagamento', () => {
    expect(derivePaymentStatus('expired', 1000, [])).toBe('expired');
    expect(derivePaymentStatus('expired', 1000, [ok(1000)])).toBe('expired');
    expect(derivePaymentStatus('cancelled', 0, [])).toBe('cancelled');
  });
  it('il rimborsabile tiene conto delle richieste in corso', () => {
    expect(summarizePayments(1000, [ok(1000)], [{ status: 'approved', amountCents: 300 }, { status: 'paid', amountCents: 200 }, { status: 'rejected', amountCents: 999 }])).toMatchObject({
      paidCents: 1000,
      refundedCents: 200,
      refundPendingCents: 300,
      refundableCents: 500,
      dueCents: 0,
    });
  });
});

describe('codici e token', () => {
  it('prefisso leggibile dall’edizione', () => {
    expect(orderCodePrefix('zuccaland-2026', 2026)).toBe('ZC26');
    expect(orderCodePrefix('assaggia-e-passeggia-2026', 2026)).toBe('AP26');
    expect(orderCodePrefix('concerto-natale-2026', 2026)).toBe('CN26');
    expect(orderCodePrefix('2026', null)).toBe('PL');
  });
  it('codici casuali senza caratteri ambigui, token non ripetuti', () => {
    const c = randomCode(200);
    expect(c).toHaveLength(200);
    expect(c).not.toMatch(/[01OIL]/);
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe('cifratura IBAN', () => {
  const key = Buffer.alloc(32, 1).toString('base64');
  it('cifra e decifra, con un IV diverso ogni volta', () => {
    const a = encryptIban('IT60X0542811101000000123456', key);
    expect(a).toMatch(/^v1:/);
    expect(a).not.toContain('IT60');
    expect(encryptIban('IT60X0542811101000000123456', key)).not.toBe(a);
    expect(decryptIban(a, key)).toBe('IT60X0542811101000000123456');
  });
  it('rifiuta chiavi sbagliate, testi alterati e chiavi mancanti', () => {
    const a = encryptIban('IT60X0542811101000000123456', key);
    expect(() => decryptIban(a, Buffer.alloc(32, 2).toString('base64'))).toThrow();
    expect(() => decryptIban(a.slice(0, -4) + 'AAAA', key)).toThrow();
    expect(() => decryptIban('v0:xx', key)).toThrow(DomainError);
    expect(() => encryptIban('x', 'corta')).toThrow(DomainError);
  });
  it('maschera l’IBAN', () => expect(maskIban('IT60 X054 2811 1010 0000 0123 456')).toBe('IT…3456'));
});

describe('eventi di dominio', () => {
  it('chiama gli handler dopo publish e non si ferma se uno fallisce', async () => {
    const { on, publish } = await import('@/server/domain/events');
    const seen: string[] = [];
    const off1 = on('order.paid', () => {
      throw new Error('rotto');
    });
    const off2 = on('order.paid', (e) => void seen.push(e.code));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await publish([{ type: 'order.paid', orderId: 'o', code: 'ZC26-AAAA', edition: 'z', totalCents: 1 }]);
    expect(seen).toEqual(['ZC26-AAAA']);
    off1();
    off2();
    await publish([{ type: 'order.paid', orderId: 'o', code: 'ZC26-BBBB', edition: 'z', totalCents: 1 }]);
    expect(seen).toEqual(['ZC26-AAAA']);
  });
});
