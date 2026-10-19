import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => ({ getDb: () => { throw new Error('non usato nei test'); } }));

const { buildLegacyEditions, statusFromDate } = await import('./legacyEditions');
const { pickDefaultEdition } = await import('./index');

const rows = [
  { id: 'baguette-2026', title: 'La Baguette da Record 2026', date: '2026-06-14', bookable: false },
  { id: 'assaggia-passeggia-2026', title: 'Assaggia e Passeggia 2026', date: '2026-08-10', bookable: false },
  { id: 'zuccaland-2026', title: 'Zuccaland 2026', date: '2026-10-25', bookable: false },
  { id: 'concerto-natale-2026', title: 'Concerto di Natale 2026', date: '2026-12-20', bookable: true },
];

describe('edizioni provvisorie', () => {
  it('deduce lo stato dalla data', () => {
    expect(statusFromDate('2026-10-25', '2026-10-19')).toBe('on_sale');
    expect(statusFromDate('2026-10-25', '2026-10-25')).toBe('live');
    expect(statusFromDate('2026-10-25', '2026-10-26')).toBe('concluded');
    expect(statusFromDate('2026-12-20', '2026-10-19', false)).toBe('published');
  });

  it('unisce ID fissi ed eventi, future prima', () => {
    const list = buildLegacyEditions(rows, '2026-10-19');
    expect(list.map((e) => e.slug)).toEqual(['zuccaland-2026', 'concerto-natale-2026', 'assaggia-e-passeggia-2026', 'baguette-2026']);
    expect(list.find((e) => e.slug === 'assaggia-e-passeggia-2026')?.status).toBe('archived');
    expect(list.find((e) => e.slug === 'zuccaland-2026')?.modules).toContain('invites');
  });

  it('sceglie l’edizione del cookie o la prima attiva', () => {
    const list = buildLegacyEditions(rows, '2026-10-19');
    expect(pickDefaultEdition(list, 'baguette-2026')?.slug).toBe('baguette-2026');
    expect(pickDefaultEdition(list, 'inesistente')?.slug).toBe('zuccaland-2026');
    expect(pickDefaultEdition([], null)).toBeNull();
  });
});
