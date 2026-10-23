import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';
import type { Ctx } from '@/server/auth/context-shared';
import { computeAvailability, soldKey } from '../quotas/availability';
import { planBackfill, slugify, statusFromDate, type LegacyEventRow } from './backfill';
import { bumpYear, shiftInstant, shiftSession, weekdayPreservingShift } from './duplicate';
import { isReadOnly, TRANSITIONS, transitionFor } from './lifecycle';
import type { EditionSummary } from './types';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => ({
  getDb: () => {
    throw new Error('il database non serve in questi test');
  },
  withTransaction: () => {
    throw new Error('il database non serve in questi test');
  },
}));

const { pickDefaultEdition, sortEditions, createEdition, updateEdition, duplicateEdition } = await import('./index');
const { saveProduct, saveSession } = await import('../catalog');

const events: LegacyEventRow[] = [
  { id: 'baguette-2026', slug: 'la-baguette-da-record-2026', title: 'La Baguette da Record 2026', date: '2026-06-14', time: '18:00', location: 'Piazza', image: '', maxParticipants: 0, price: 0, bookable: false, isFree: true },
  { id: 'assaggia-passeggia-2026', slug: 'assaggia-e-passeggia-2026', title: 'Assaggia e Passeggia 2026', date: '2026-08-10', time: '19:00', location: 'Borgo', image: '', maxParticipants: 600, price: 17, bookable: false, isFree: false },
  { id: 'zuccaland-2026', slug: 'zuccaland-2026', title: 'Zuccaland 2026', date: '2026-10-25', time: '10:30', location: 'Gasperina', image: '/z.jpg', maxParticipants: 900, price: 5, bookable: false, isFree: false },
  { id: 'concerto-natale-2026', slug: 'concerto-di-natale-2026', title: 'Concerto di Natale 2026', date: '2026-12-20', time: '21:00', location: 'Chiesa', image: '', maxParticipants: 120, price: 0, bookable: true, isFree: true },
];

const zuccaland: ZuccalandContent = {
  ...DEFAULT_ZUCCALAND_CONTENT,
  dateLimits: { ...DEFAULT_ZUCCALAND_CONTENT.dateLimits, '24': { enabled: true, maxTickets: 250, manualSoldOut: false, active: true } },
};

const plan = planBackfill({ events, zuccaland, cashier: null, today: '2026-10-19' });

describe('backfill delle edizioni', () => {
  it('deduce lo stato dalla data', () => {
    expect(statusFromDate('2026-10-25', '2026-10-19')).toBe('on_sale');
    expect(statusFromDate('2026-10-25', '2026-10-25')).toBe('live');
    expect(statusFromDate('2026-10-25', '2026-10-26')).toBe('concluded');
    expect(statusFromDate('2026-12-20', '2026-10-19', false)).toBe('published');
  });

  it('crea i tre format e collega le edizioni 2026 con pagina dedicata', () => {
    expect(plan.series.map((s) => s.slug)).toEqual(['zuccaland', 'assaggia-e-passeggia', 'baguette-da-record']);
    const z = plan.editions.find((e) => e.slug === 'zuccaland-2026')!;
    expect(z).toMatchObject({ seriesSlug: 'zuccaland', publicPageMode: 'landing', status: 'on_sale', year: 2026 });
    expect(z.legacy).toContainEqual({ kind: 'event', id: 'zuccaland-2026' });
    expect(plan.editions.find((e) => e.slug === 'assaggia-e-passeggia-2026')).toMatchObject({ status: 'archived' });
    expect(plan.editions.find((e) => e.slug === 'assaggia-e-passeggia-2026')!.legacy.map((l) => l.id)).toEqual(
      expect.arrayContaining(['assaggia-passeggia-2026', 'assaggia-passeggia']),
    );
  });

  it('gli altri eventi diventano edizioni generiche', () => {
    const c = plan.editions.find((e) => e.slug === 'concerto-natale-2026')!;
    expect(c).toMatchObject({ seriesSlug: null, publicPageMode: 'generic', status: 'on_sale', enabledModules: ['free-booking'] });
    expect(plan.products.find((p) => p.edition === 'concerto-natale-2026')).toMatchObject({ name: 'Prenotazione', priceCents: 0, issuesTicket: false });
    expect(plan.sessions.find((s) => s.edition === 'concerto-natale-2026')).toMatchObject({ capacity: 120 });
  });

  it('Zuccaland: attività gratuite con i loro giorni, posti e il laboratorio a pagamento', () => {
    const m = plan.moduleSettings.find((x) => x.edition === 'zuccaland-2026' && x.module === 'activities')!;
    const s = m.settings as { labProductId: unknown; activities: Array<{ key: string; sessionIds: Array<{ $ref: { id: string } }>; maxPlaces: number }> };
    expect(s.labProductId).toEqual({ $ref: { kind: 'ticket_type', id: 'zuccaland-2026:laboratorio' } });
    const zv = s.activities.find((a) => a.key === 'zucca_vaso')!;
    expect(zv.maxPlaces).toBe(60);
    expect(zv.sessionIds.map((r) => r.$ref.id)).toEqual(['zuccaland-2026:10', 'zuccaland-2026:17', 'zuccaland-2026:24']);
    expect(s.activities.find((a) => a.key === 'zuccart')!.sessionIds).toEqual([]);
  });

  it('Zuccaland: prodotti con gli stessi prezzi della pagina attuale', () => {
    const zp = plan.products.filter((p) => p.edition === 'zuccaland-2026');
    expect(zp.map((p) => [p.name, p.priceCents, p.kind])).toEqual(
      DEFAULT_ZUCCALAND_CONTENT.ticketTypes.map((t) => [t.label, Math.round(t.price * 100), t.isExtra ? 'addon' : 'ticket']),
    );
    expect(zp.every((p) => p.requiresSession && p.issuesTicket && p.channels.join() === 'online')).toBe(true);
  });

  it('Zuccaland: una data per giorno, alle 10:30 di Roma, con capienza e stato', () => {
    const zs = plan.sessions.filter((s) => s.edition === 'zuccaland-2026');
    expect(zs.map((s) => s.legacy.id)).toEqual(['10', '11', '17', '18', '24', '25'].map((d) => `zuccaland-2026:${d}`));
    const d25 = zs.find((s) => s.legacy.id.endsWith(':25'))!;
    // 25 ottobre 2026: si torna all'ora solare, 10:30 a Roma = 09:30 UTC.
    expect(d25.startsAt.toISOString()).toBe('2026-10-25T09:30:00.000Z');
    expect(zs.find((s) => s.legacy.id.endsWith(':17'))!.startsAt.toISOString()).toBe('2026-10-17T08:30:00.000Z');
    expect(d25).toMatchObject({ capacity: 300, status: 'sold_out', label: 'Dom 25 ott' });
    expect(zs.find((s) => s.legacy.id.endsWith(':24'))).toMatchObject({ capacity: 250, status: 'open' });
    expect(zs.find((s) => s.legacy.id.endsWith(':10'))).toMatchObject({ capacity: null, status: 'postponed', rescheduledTo: { kind: 'zuccaland_day', id: 'zuccaland-2026:17' } });
    expect(zs.find((s) => s.legacy.id.endsWith(':11'))).toMatchObject({ status: 'postponed', rescheduledTo: { id: 'zuccaland-2026:18' } });
    expect(zs.find((s) => s.legacy.id.endsWith(':17'))!.rescheduledTo).toBeUndefined();
  });

  it("un evento di cassa con un ID diverso si unisce all'edizione con lo stesso nome", () => {
    const p = planBackfill({
      events,
      zuccaland,
      today: '2026-10-19',
      cashier: {
        events: [
          {
            id: 'sagra-tradizioni-2026',
            name: 'Zuccaland_2026',
            eventCode: 'Z',
            active: true,
            categories: [],
            createdAt: '',
            updatedAt: '',
            items: [{ id: 'zeppola', name: 'Zeppola', category: 'Dolci', price: 2, isAvailable: true }],
          },
        ],
      },
    });
    expect(p.editions.find((e) => e.slug === 'sagra-tradizioni-2026')).toBeUndefined();
    expect(p.editions.find((e) => e.slug === 'zuccaland-2026')!.legacy).toContainEqual({ kind: 'cashier_event', id: 'sagra-tradizioni-2026' });
    expect(p.products.filter((x) => x.edition === 'zuccaland-2026' && x.channels.includes('pos')).map((x) => x.name)).toEqual(['Zeppola']);
  });

  it('la cassa porta i prodotti con canale pos e le scorte come quote', () => {
    const withCashier = planBackfill({
      events,
      zuccaland,
      today: '2026-10-19',
      cashier: {
        events: [
          {
            id: 'sagra-2026',
            name: 'Sagra 2026',
            eventCode: 'X',
            active: true,
            categories: [],
            createdAt: '',
            updatedAt: '',
            items: [
              { id: 'birra', name: 'Birra', category: 'Bevande', price: 3.5, isAvailable: true, stockQuantity: 40 },
              { id: 'panino', name: 'Panino', category: 'Panini', department: 'Griglia', price: 6, isAvailable: false },
              { id: 'rotto', name: 'Errore', category: 'X', price: -1, isAvailable: true },
            ],
          },
          { id: 'zuccaland-2026', name: 'Zuccaland', eventCode: 'Z', active: true, categories: [], createdAt: '', updatedAt: '', items: [] },
        ],
      },
    });
    const sagra = withCashier.editions.find((e) => e.slug === 'sagra-2026')!;
    expect(sagra).toMatchObject({ status: 'draft', year: 2026 });
    expect(withCashier.products.filter((p) => p.edition === 'sagra-2026').map((p) => [p.name, p.kind, p.priceCents, p.channels[0], p.active])).toEqual([
      ['Birra', 'drink', 350, 'pos', true],
      ['Panino', 'food', 600, 'pos', false],
    ]);
    expect(withCashier.quotas).toEqual([expect.objectContaining({ name: 'Scorta: Birra', size: 40 })]);
    expect(withCashier.skipped).toContainEqual(expect.objectContaining({ id: 'sagra-2026:rotto' }));
    // La cassa di Zuccaland si aggancia all'edizione esistente, non ne crea un'altra.
    expect(withCashier.editions.filter((e) => e.slug.startsWith('zuccaland'))).toHaveLength(1);
    expect(withCashier.editions.find((e) => e.slug === 'zuccaland-2026')!.legacy).toContainEqual({ kind: 'cashier_event', id: 'zuccaland-2026' });
    // Senza elenco di casse: una sola "Cassa" che vende tutto.
    expect(withCashier.registers.filter((r) => r.edition === 'sagra-2026')).toEqual([expect.objectContaining({ name: 'Cassa', products: null, sort: 1 })]);
  });

  it('le casse della vecchia configurazione diventano casse con i loro prodotti e la stampante', () => {
    const plan = planBackfill({
      events: [],
      zuccaland: null,
      today: '2026-10-19',
      cashier: {
        defaultPrinterSettings: { ticketWidthMm: 80, charactersPerLine: 48, autoPrintOnOrder: true, printCustomerReceipt: true, printDepartmentSlips: false, showQrCode: true, autoCutPaper: true },
        events: [
          {
            id: 'sagra-2026',
            name: 'Sagra 2026',
            eventCode: 'X',
            active: true,
            categories: [],
            createdAt: '',
            updatedAt: '',
            casses: ['Cassa 1', 'Bar', 'Bar'],
            cassaAssignments: { Bar: ['birra', 'sparito'], 'Cassa 1': [] },
            items: [
              { id: 'birra', name: 'Birra', category: 'Bevande', price: 3.5, isAvailable: true },
              { id: 'panino', name: 'Panino', category: 'Panini', price: 6, isAvailable: true },
            ],
          },
        ],
      },
    });
    expect(plan.registers.map((r) => [r.name, r.products, r.sort, r.legacy.id])).toEqual([
      ['Cassa 1', null, 1, 'sagra-2026:Cassa 1'],
      ['Bar', [{ kind: 'cashier_item', id: 'sagra-2026:birra' }], 2, 'sagra-2026:Bar'],
    ]);
    expect(plan.registers[0].printer).toMatchObject({ ticketWidthMm: 80, autoPrintOnOrder: true, showQrCode: false });
    expect(plan.notes.some((n) => n.includes('Bar') && n.includes('1 prodotti'))).toBe(true);
  });

  it('slug sicuri', () => {
    expect(slugify('Festa d’Autunno 2026!')).toBe('festa-d-autunno-2026');
    expect(slugify('Città')).toBe('citta');
  });
});

describe('ordine e scelta delle edizioni', () => {
  const e = (slug: string, startsOn: string | null, status: EditionSummary['status']): EditionSummary => ({
    id: slug,
    slug,
    title: slug,
    format: null,
    formatName: null,
    status,
    startsOn,
    endsOn: null,
    dot: 'gray',
    modules: [],
    legacyIds: [slug],
    imported: false,
    hasPageEditor: false,
  });
  const list = sortEditions([e('baguette', '2026-06-14', 'concluded'), e('natale', '2026-12-20', 'on_sale'), e('zucca', '2026-10-25', 'on_sale'), e('sagra', null, 'draft')], '2026-10-19');

  it('prima le future dalla più vicina, poi le passate, poi quelle senza data', () => {
    expect(list.map((x) => x.slug)).toEqual(['zucca', 'natale', 'baguette', 'sagra']);
  });

  it('un’edizione iniziata ma non finita resta tra le prossime', () => {
    const inCorso = { ...e('zucca', '2026-10-17', 'on_sale'), endsOn: '2026-10-25' };
    expect(sortEditions([e('natale', '2026-12-20', 'on_sale'), inCorso], '2026-10-19').map((x) => x.slug)).toEqual(['zucca', 'natale']);
  });

  it('sceglie l’edizione del cookie o la prima attiva', () => {
    expect(pickDefaultEdition(list, 'baguette')?.slug).toBe('baguette');
    expect(pickDefaultEdition(list, 'inesistente')?.slug).toBe('zucca');
    expect(pickDefaultEdition([], null)).toBeNull();
  });
});

describe('duplicare un’edizione', () => {
  it('sposta le date di un anno restando nello stesso giorno della settimana', () => {
    const days = weekdayPreservingShift('2026-10-25', 1);
    expect(days % 7).toBe(0);
    expect(days).toBe(364);
    const moved = shiftInstant(new Date('2026-10-25T09:30:00Z'), days);
    // Domenica 24 ottobre 2027, ancora alle 10:30 di Roma (ora legale: 08:30 UTC).
    expect(moved.toISOString()).toBe('2027-10-24T08:30:00.000Z');
    expect(new Date(moved).getUTCDay()).toBe(0);
  });

  it('di più anni, senza scivolare di settimane', () => {
    expect(weekdayPreservingShift('2026-10-25', 2)).toBe(728);
    // 6 anni = 2192 giorni (due 29 febbraio): il multiplo di 7 più vicino è 2191.
    expect(weekdayPreservingShift('2026-10-25', 6)).toBe(2191);
  });

  it('aggiorna l’etichetta della data e l’anno nei testi', () => {
    const s = shiftSession({ id: 'x', label: 'Dom 25 ott', startsAt: new Date('2026-10-25T09:30:00Z'), endsAt: new Date('2026-10-25T17:00:00Z') }, 364);
    expect(s.label).toBe('Dom 24 ott');
    expect(s.endsAt!.toISOString()).toBe('2027-10-24T16:00:00.000Z');
    expect(bumpYear('Zuccaland 2026', 2026, 2027)).toBe('Zuccaland 2027');
    expect(bumpYear('Il villaggio delle zucche', 2026, 2027)).toBe('Il villaggio delle zucche');
  });
});

describe('ciclo di vita', () => {
  it('passaggi ammessi e permessi', () => {
    expect(transitionFor('draft', 'published')).not.toBeNull();
    expect(transitionFor('draft', 'archived')).toBeNull();
    expect(transitionFor('live', 'concluded')?.typeToConfirm).toBe(true);
    expect(transitionFor('concluded', 'archived')?.permission).toBe('editions.archive');
    expect(TRANSITIONS.archived).toEqual([]);
    expect(isReadOnly('archived')).toBe(true);
    expect(isReadOnly('concluded')).toBe(false);
  });

  it('si archivia solo dopo aver dichiarato conclusa', () => {
    const fromAnyOther = Object.entries(TRANSITIONS).filter(([from, list]) => from !== 'concluded' && list.some((t) => t.to === 'archived'));
    expect(fromAnyOther).toEqual([]);
  });
});

describe('disponibilità dalle quote', () => {
  const products = [
    { id: 'ingresso', kind: 'ticket', requiresSession: true, active: true },
    { id: 'lab', kind: 'addon', requiresSession: true, active: true },
    { id: 'birra', kind: 'drink', requiresSession: false, active: true },
  ];
  const sessions = [
    { id: 'sab', capacity: 300, status: 'open' },
    { id: 'dom', capacity: 300, status: 'sold_out' },
  ];

  it('il minimo tra quote sovrapposte, compresa la capienza della data', () => {
    const sold = new Map([
      [soldKey('ingresso', 'sab'), 280],
      [soldKey('lab', 'sab'), 50],
    ]);
    const a = computeAvailability({
      products,
      sessions,
      sold,
      quotas: [
        { id: 'lab-sab', size: 60, sessionId: 'sab', productIds: ['lab'] },
        { id: 'lab-totale', size: 100, sessionId: null, productIds: ['lab'] },
        { id: 'scorta-birra', size: 40, sessionId: null, productIds: ['birra'] },
      ],
    });
    const get = (p: string, s: string | null) => a.products.find((x) => x.productId === p && x.sessionId === s)!;
    expect(get('ingresso', 'sab')).toMatchObject({ remaining: 20, limitedBy: 'session:sab' });
    expect(get('lab', 'sab')).toMatchObject({ remaining: 10, limitedBy: 'lab-sab' });
    expect(get('birra', null)).toMatchObject({ remaining: 40 });
    // Una data esaurita non vende, anche con posti liberi.
    expect(get('ingresso', 'dom').remaining).toBe(0);
    expect(a.sessions.find((s) => s.id === 'sab')).toMatchObject({ used: 280, remaining: 20 });
    expect(a.quotas.find((q) => q.id === 'lab-totale')).toMatchObject({ used: 50, remaining: 50 });
  });

  it('la quota senza data conta le vendite di tutte le date', () => {
    const sold = new Map([
      [soldKey('lab', 'sab'), 30],
      [soldKey('lab', 'dom'), 25],
    ]);
    const a = computeAvailability({ products, sessions: [{ id: 'sab', capacity: null, status: 'open' }, { id: 'dom', capacity: null, status: 'open' }], sold, quotas: [{ id: 'q', size: 60, sessionId: null, productIds: ['lab'] }] });
    expect(a.products.find((x) => x.productId === 'lab' && x.sessionId === 'dom')?.remaining).toBe(5);
    expect(a.products.find((x) => x.productId === 'ingresso' && x.sessionId === 'sab')?.remaining).toBeNull();
  });

  it('mai sotto zero, e un prodotto disattivato non vende', () => {
    const a = computeAvailability({
      products: [{ id: 'p', kind: 'ticket', requiresSession: false, active: false }],
      sessions: [],
      sold: new Map([[soldKey('p', null), 12]]),
      quotas: [{ id: 'q', size: 10, sessionId: null, productIds: ['p'] }],
    });
    expect(a.quotas[0].remaining).toBe(0);
    expect(a.products[0].remaining).toBe(0);
  });
});

describe('permessi dei servizi', () => {
  const ctx = (role: Ctx['grants'][number]['role'], edition: string | null = null): Ctx => ({ user: { id: 'u', name: 'U', email: null }, device: null, legacy: false, grants: [{ role, edition }], ip: null });

  it('creare e duplicare edizioni è solo per titolare e amministratori', async () => {
    const input = { mode: 'empty' as const, title: 'Prova 2027', slug: 'prova-2027' };
    await expect(createEdition(ctx('editor'), input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(createEdition(ctx('event_manager'), input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(duplicateEdition(ctx('event_manager', 'zuccaland-2026'), 'zuccaland-2026', { title: 'Z 2027', slug: 'zuccaland-2027', year: 2027 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('un responsabile modifica solo le sue edizioni', async () => {
    const input = { title: 'Zuccaland 2026', seriesId: null, startsDate: null, startsTime: null, endsDate: null, endsTime: null, publicPageMode: 'landing' as const };
    await expect(updateEdition(ctx('event_manager', 'baguette-2026'), 'zuccaland-2026', input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(updateEdition(ctx('cashier', 'zuccaland-2026'), 'zuccaland-2026', input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('la cassa e lo scanner non toccano il catalogo', async () => {
    const product = { kind: 'ticket' as const, name: 'Ingresso', description: null, icon: null, priceCents: 500, channels: ['online' as const], requiresSession: true, issuesTicket: true, department: null, active: true, minPerOrder: null, maxPerOrder: null };
    await expect(saveProduct(ctx('cashier', 'zuccaland-2026'), 'zuccaland-2026', null, product)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveSession(ctx('gate', 'zuccaland-2026'), 'zuccaland-2026', null, { label: 'Sab', date: '2026-10-24', startTime: '10:30', endTime: null, capacity: 300, status: 'open' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('i prezzi negativi sono rifiutati prima di toccare il database', async () => {
    const bad = { kind: 'ticket' as const, name: 'Ingresso', description: null, icon: null, priceCents: -100, channels: ['online' as const], requiresSession: true, issuesTicket: true, department: null, active: true, minPerOrder: null, maxPerOrder: null };
    await expect(saveProduct(ctx('owner'), 'zuccaland-2026', null, bad)).rejects.toThrow(/negativo/);
  });
});
