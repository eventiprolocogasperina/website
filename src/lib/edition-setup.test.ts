import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';
import { prepareCopiedBlocks, remapIds } from '@/server/domain/editions/duplicate';
import { computeSetupChecklist, firstOpenStep, opensSales, readSetupState, salesBlockedMessage, slugFromTitle, stepsFor, type SetupFacts } from './edition-setup';

const ticket = { kind: 'ticket', active: true, channels: ['online', 'pos'], priceCents: 500, openPrice: false };

/** Edizione nuova, appena creata: niente di niente. */
const empty: SetupFacts = {
  kind: 'sales',
  status: 'draft',
  location: null,
  startsAt: null,
  subtitle: null,
  publicPageMode: 'landing',
  sessions: [],
  products: [],
  activities: 0,
  visibleBlocks: 0,
  rulesUrl: null,
  registers: 0,
  discounts: 0,
  invites: 0,
  skipped: [],
};

/** Edizione pronta per aprire le vendite. */
const ready: SetupFacts = {
  ...empty,
  status: 'published',
  location: 'Gasperina',
  startsAt: new Date('2027-10-23T08:00:00Z'),
  sessions: [
    { status: 'open', capacity: 300 },
    { status: 'open', capacity: 250 },
  ],
  products: [ticket],
  visibleBlocks: 6,
  rulesUrl: 'https://example.com/regolamento.pdf',
};

const statusOf = (f: SetupFacts) => Object.fromEntries(computeSetupChecklist(f).items.map((i) => [i.key, i.status]));

describe('checklist "Da completare"', () => {
  it('ha i passi in ordine, con obbligatori e facoltativi', () => {
    const list = computeSetupChecklist(empty);
    expect(list.items.map((i) => i.key)).toEqual(['dates', 'tickets', 'extras', 'page', 'rules', 'registers', 'discounts', 'publish']);
    expect(list.items.filter((i) => i.required).map((i) => i.key)).toEqual(['dates', 'tickets', 'page', 'rules', 'publish']);
    expect(list.done).toBe(0);
    expect(list.total).toBe(8);
    expect(list.items[0].path).toBe('date');
  });

  it('calcola lo stato dai dati', () => {
    expect(statusOf(ready)).toMatchObject({ dates: 'done', tickets: 'done', page: 'done', rules: 'done', extras: 'todo', registers: 'todo', publish: 'todo' });
    const list = computeSetupChecklist({ ...ready, registers: 2, discounts: 1, invites: 3, activities: 2, products: [ticket, { ...ticket, kind: 'addon', priceCents: 300 }] });
    expect(list.items.find((i) => i.key === 'registers')?.detail).toBe('2 casse attive');
    expect(list.items.find((i) => i.key === 'discounts')?.detail).toBe('1 codice · 3 inviti');
    expect(list.items.find((i) => i.key === 'extras')?.detail).toBe('1 extra · 2 attività');
    expect(list.items.find((i) => i.key === 'tickets')?.detail).toBe(`1 biglietto, da ${formatMoney(500)}`);
    expect(list.items.find((i) => i.key === 'dates')?.detail).toBe('2 date · 550 posti · Gasperina');
  });

  it('una data senza capienza o senza luogo non basta', () => {
    const noCap = computeSetupChecklist({ ...ready, sessions: [...ready.sessions, { status: 'open', capacity: null }] });
    expect(noCap.items[0]).toMatchObject({ status: 'todo', detail: '1 data senza capienza' });
    expect(computeSetupChecklist({ ...ready, location: null }).items[0].detail).toBe('Manca il luogo');
    // Le date annullate non contano.
    expect(computeSetupChecklist({ ...ready, sessions: [{ status: 'cancelled', capacity: null }] }).items[0].detail).toBe('Aggiungi almeno una data');
  });

  it('un biglietto spento, solo in cassa o "Altro" non vende online', () => {
    const products = [
      { ...ticket, active: false },
      { ...ticket, channels: ['pos'] },
      { ...ticket, openPrice: true },
    ];
    expect(statusOf({ ...ready, products }).tickets).toBe('todo');
  });

  it('la pagina generica basta con la descrizione, quella dedicata va salvata', () => {
    expect(statusOf({ ...ready, visibleBlocks: 0 }).page).toBe('todo');
    expect(statusOf({ ...ready, visibleBlocks: 0, publicPageMode: 'generic', subtitle: 'Concerto in piazza' }).page).toBe('done');
  });

  it('un passo saltato resta da fare, finché i dati non ci sono', () => {
    const f = { ...empty, skipped: ['tickets', 'registers', 'publish'] as SetupFacts['skipped'] };
    expect(statusOf(f)).toMatchObject({ tickets: 'skipped', registers: 'skipped', dates: 'todo', publish: 'todo' });
    expect(statusOf({ ...ready, skipped: ['tickets'] }).tickets).toBe('done');
    expect(firstOpenStep(computeSetupChecklist(f)).key).toBe('dates');
    expect(firstOpenStep(computeSetupChecklist({ ...ready, status: 'on_sale', registers: 1, discounts: 1, activities: 1 })).key).toBe('publish');
  });

  it('un evento solo informativo ha tre passi', () => {
    expect(stepsFor('info')).toEqual(['dates', 'page', 'publish']);
    const info = computeSetupChecklist({ ...empty, kind: 'info', publicPageMode: 'generic' });
    expect(info.items.map((i) => [i.key, i.status, i.required])).toEqual([
      ['dates', 'todo', true],
      ['page', 'todo', true],
      ['publish', 'todo', true],
    ]);
    expect(info.items[0].detail).toBe('Manca la data e il luogo');
    const done = computeSetupChecklist({ ...empty, kind: 'info', status: 'published', location: 'Chiesa', startsAt: new Date(), subtitle: 'x', publicPageMode: 'generic' });
    expect(done.done).toBe(3);
  });

  it('pubblica e apri le vendite segue lo stato', () => {
    expect(statusOf({ ...ready, status: 'published' }).publish).toBe('todo');
    expect(statusOf({ ...ready, status: 'on_sale' }).publish).toBe('done');
    expect(statusOf({ ...ready, status: 'sold_out' }).publish).toBe('done');
  });
});

describe('guardia delle vendite', () => {
  it('si applica solo quando le vendite si aprono a mano', () => {
    expect(opensSales('published', 'on_sale')).toBe(true);
    expect(opensSales('suspended', 'on_sale')).toBe(true);
    // Riapertura dopo "esaurita": le vendite erano già aperte.
    expect(opensSales('sold_out', 'on_sale')).toBe(false);
    expect(opensSales('draft', 'published')).toBe(false);
  });

  it('blocca finché mancano date, biglietto, pagina o regolamento, anche se saltati', () => {
    expect(computeSetupChecklist(ready).salesBlockers).toEqual([]);
    const missing = computeSetupChecklist({ ...ready, rulesUrl: null, sessions: [{ status: 'open', capacity: null }], skipped: ['rules'] }).salesBlockers;
    expect(missing.map((b) => b.key)).toEqual(['dates', 'rules']);
    expect(salesBlockedMessage(missing)).toBe('Prima di aprire le vendite completa: Date e luogo (1 data senza capienza); Regolamento (manca il link al regolamento).');
    // I facoltativi (casse, codici, extra) non bloccano.
    expect(computeSetupChecklist({ ...ready, registers: 0, discounts: 0 }).salesBlockers).toEqual([]);
  });

  it('un evento informativo che prova a vendere deve avere i passi delle vendite', () => {
    const info = computeSetupChecklist({ ...empty, kind: 'info', status: 'published', location: 'Chiesa', startsAt: new Date(), subtitle: 'x', publicPageMode: 'generic' });
    expect(info.salesBlockers.map((b) => b.key)).toEqual(['dates', 'tickets', 'rules']);
  });
});

describe('stato della procedura salvato', () => {
  it('legge tipo e passi saltati, scartando il resto', () => {
    expect(readSetupState({ _setup: { kind: 'info', skipped: ['rules', 'rules', 'boh', 3] } })).toEqual({ kind: 'info', skipped: ['rules'] });
    expect(readSetupState({ activities: {} })).toEqual({ kind: null, skipped: [] });
    expect(readSetupState({ _setup: 'x' })).toEqual({ kind: null, skipped: [] });
    expect(readSetupState(null)).toEqual({ kind: null, skipped: [] });
  });

  it('propone lo slug dal titolo', () => {
    expect(slugFromTitle('Assaggia & Passeggia 2027')).toBe('assaggia-passeggia-2027');
    expect(slugFromTitle('Città in festa')).toBe('citta-in-festa');
  });
});

describe('copia di un’edizione', () => {
  it('sostituisce gli ID copiati ovunque nelle impostazioni dei moduli', () => {
    const map = new Map([
      ['old-day', 'new-day'],
      ['old-lab', 'new-lab'],
    ]);
    const settings = { activities: { labProductId: 'old-lab', activities: [{ key: 'zucca', sessionIds: ['old-day', 'altro'], maxPlaces: 20 }] }, reviews: { enabled: true } };
    expect(remapIds(settings, map)).toEqual({ activities: { labProductId: 'new-lab', activities: [{ key: 'zucca', sessionIds: ['new-day', 'altro'], maxPlaces: 20 }] }, reviews: { enabled: true } });
  });

  it('porta l’anno della copertina e il conto alla rovescia all’anno nuovo', () => {
    const blocks = [
      { id: 'a', type: 'Hero', hidden: false, props: { title: 'Zuccaland 2026', badge: 'Ottobre 2026', description: 'Nel 2026 eravamo 5000' } },
      { id: 'b', type: 'Countdown', hidden: false, props: { target: '2026-10-24T10:00', title: 'Manca poco' } },
      { id: 'c', type: 'NumeriChiave', hidden: false, props: { title: 'I numeri del 2026' } },
    ];
    const out = prepareCopiedBlocks(blocks, { fromYear: 2026, toYear: 2027, days: 364 }) as typeof blocks;
    expect(out[0].props).toMatchObject({ title: 'Zuccaland 2027', badge: 'Ottobre 2027', description: 'Nel 2026 eravamo 5000' });
    expect(out[1].props.target).toBe('2027-10-23T10:00');
    expect(out[2].props.title).toBe('I numeri del 2026');
    expect(blocks[0].props.title).toBe('Zuccaland 2026');
    expect(prepareCopiedBlocks(null, { fromYear: 2026, toYear: 2027, days: 364 })).toEqual([]);
  });
});
