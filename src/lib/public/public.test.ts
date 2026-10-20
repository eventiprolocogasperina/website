import { describe, expect, it } from 'vitest';
import { buildCalendar, parseCalendarFilters, upcomingCards } from './calendar';
import { currentEditionOf, editionHref, editionHrefs, isPastEdition, normalizeLandingPath, type PublicEdition } from './editions';
import { DEFAULT_NAV, NavConfig, isActiveHref, parseNavConfig, resolveNav } from './nav';
import { DEFAULT_TRANSPARENCY, PrivacyRequestInput, TransparencyContent } from './transparency';
import { eventJsonLd, eventStatusOf, jsonLdText } from '@/lib/seo/jsonld';

const zucca = { slug: 'zuccaland', name: 'Zuccaland', landingPath: '/zuccaland', dot: 'orange' };
function ed(p: Partial<PublicEdition> & { id: string }): PublicEdition {
  return {
    slug: p.id,
    title: p.id,
    subtitle: null,
    description: null,
    year: 2026,
    status: 'on_sale',
    startsAt: new Date('2026-10-17T08:00:00Z'),
    endsAt: null,
    location: null,
    coverImage: null,
    category: null,
    publicPageMode: 'generic',
    series: null,
    legacySlug: null,
    ...p,
  };
}

const z26 = ed({ id: 'zuccaland-2026', endsAt: new Date('2026-10-25T20:00:00Z'), publicPageMode: 'landing', series: zucca, category: 'comunità' });
const z27 = ed({ id: 'zuccaland-2027', year: 2027, status: 'published', startsAt: new Date('2027-10-16T08:00:00Z'), publicPageMode: 'landing', series: zucca });
const z25 = ed({ id: 'zuccaland-2025', year: 2025, status: 'archived', startsAt: new Date('2025-10-18T08:00:00Z'), publicPageMode: 'landing', series: zucca });
const concerto = ed({ id: 'concerto-natale-2026', startsAt: new Date('2026-12-20T20:00:00Z'), category: 'musica', legacySlug: 'concerto-di-natale-2026' });
const baguette = ed({ id: 'baguette-2026', status: 'concluded', startsAt: new Date('2026-06-14T08:00:00Z'), publicPageMode: 'landing', series: { ...zucca, slug: 'baguette', landingPath: null }, legacySlug: 'la-baguette-da-record-2026' });

describe('indirizzi delle edizioni (decisione 1A)', () => {
  it('edizione corrente = la prima per data tra quelle attive', () => {
    expect(currentEditionOf([z27, z26, z25])?.id).toBe('zuccaland-2026');
    expect(currentEditionOf([z25])).toBeNull();
  });
  it('pagina dedicata: /<format> per la corrente, /<format>/<anno> per le altre', () => {
    const h = editionHrefs([z25, z26, z27, concerto, baguette]);
    expect(h.get('zuccaland-2026')).toBe('/zuccaland');
    expect(h.get('zuccaland-2027')).toBe('/zuccaland/2027');
    expect(h.get('zuccaland-2025')).toBe('/zuccaland/2025');
    expect(h.get('concerto-natale-2026')).toBe('/eventi/concerto-natale-2026');
    expect(h.get('baguette-2026')).toBe('/eventi/la-baguette-da-record-2026');
  });
  it('percorso del format normalizzato', () => {
    expect(normalizeLandingPath('/zuccaland/')).toBe('/zuccaland');
    expect(normalizeLandingPath('zuccaland')).toBeNull();
    expect(normalizeLandingPath('//evil.com')).toBeNull();
    expect(editionHref({ ...z26, series: { ...zucca, landingPath: 'x' } }, true)).toBe('/eventi/zuccaland-2026');
  });
  it('passata se conclusa o finita', () => {
    expect(isPastEdition(baguette, '2026-01-01')).toBe(true);
    expect(isPastEdition(concerto, '2026-10-19')).toBe(false);
    expect(isPastEdition(concerto, '2026-12-21')).toBe(true);
  });
});

describe('calendario', () => {
  const list = [z25, z26, z27, concerto, baguette];
  const hrefs = editionHrefs(list);
  it('filtri dall’URL, valori non validi ignorati', () => {
    expect(parseCalendarFilters({ categoria: 'musica', mese: '2026-12' })).toEqual({ category: 'musica', month: '2026-12' });
    expect(parseCalendarFilters({ categoria: 'x', mese: '2026-13' })).toEqual({ category: null, month: null });
  });
  it('prossimi in ordine di data, archivio dal più recente, card verso la pagina dedicata', () => {
    const cal = buildCalendar(list, hrefs, { category: null, month: null }, '2026-10-19');
    expect(cal.upcoming.map((c) => c.href)).toEqual(['/zuccaland', '/eventi/concerto-natale-2026', '/zuccaland/2027']);
    expect(cal.past.map((c) => c.id)).toEqual(['baguette-2026', 'zuccaland-2025']);
    expect(cal.months).toContain('2026-12');
  });
  it('filtra per categoria e mese', () => {
    expect(buildCalendar(list, hrefs, { category: 'musica', month: null }, '2026-10-19').upcoming.map((c) => c.id)).toEqual(['concerto-natale-2026']);
    expect(buildCalendar(list, hrefs, { category: null, month: '2027-10' }, '2026-10-19').upcoming.map((c) => c.id)).toEqual(['zuccaland-2027']);
  });
  it('home: al massimo tre prossimi', () => {
    expect(upcomingCards(list, hrefs, '2026-10-19', 2)).toHaveLength(2);
  });
});

describe('menu', () => {
  const formats = [{ slug: 'zuccaland', name: 'Zuccaland', href: '/zuccaland' }, { slug: 'assaggia-e-passeggia', name: 'Assaggia e Passeggia', href: '/assaggia-e-passeggia' }];
  it('tendina Eventi con Calendario e i format (senza Baguette, che non ha pagina)', () => {
    const nav = resolveNav(DEFAULT_NAV, formats);
    expect(nav.items.find((i) => i.label === 'Eventi')?.children.map((c) => c.label)).toEqual(['Calendario', 'Zuccaland', 'Assaggia e Passeggia']);
    expect(resolveNav({ ...DEFAULT_NAV, hiddenFormats: ['zuccaland'] }, formats).items[3].children).toHaveLength(2);
  });
  it('configurazione non valida → menu predefinito', () => {
    expect(parseNavConfig('{rotto')).toBe(DEFAULT_NAV);
    expect(parseNavConfig(JSON.stringify({ items: [] }))).toBe(DEFAULT_NAV);
    expect(NavConfig.safeParse({ ...DEFAULT_NAV, items: [{ label: 'X', href: 'javascript:alert(1)' }] }).success).toBe(false);
  });
  it('voce attiva', () => {
    expect(isActiveHref('/eventi/x', '/eventi')).toBe(true);
    expect(isActiveHref('/eventi', '/')).toBe(false);
  });
});

describe('trasparenza e SEO', () => {
  it('il contenuto di partenza è valido e nomina tutti i fornitori', () => {
    expect(TransparencyContent.safeParse(DEFAULT_TRANSPARENCY).success).toBe(true);
    const names = DEFAULT_TRANSPARENCY.processors.map((p) => p.name).join(' ');
    for (const n of ['Vercel', 'Neon', 'Nexi', 'Resend', 'Cloudinary', 'Telegram', 'WhatsApp']) expect(names).toContain(n);
  });
  it('richiesta: consenso obbligatorio', () => {
    expect(PrivacyRequestInput.safeParse({ kind: 'access', name: 'Mario Rossi', email: 'm@x.it', consent: false }).success).toBe(false);
    expect(PrivacyRequestInput.safeParse({ kind: 'access', name: 'Mario Rossi', email: 'm@x.it', consent: true }).success).toBe(true);
  });
  it('stato schema.org', () => {
    const s = (status: 'open' | 'cancelled' | 'postponed', rescheduled = false) => ({ startsAt: new Date(), endsAt: null, status, rescheduled });
    expect(eventStatusOf('on_sale', [s('open')])).toBe('https://schema.org/EventScheduled');
    expect(eventStatusOf('on_sale', [s('cancelled')])).toBe('https://schema.org/EventCancelled');
    expect(eventStatusOf('suspended', [s('open')])).toBe('https://schema.org/EventPostponed');
    expect(eventStatusOf('on_sale', [s('postponed', true), s('open')])).toBe('https://schema.org/EventRescheduled');
    expect(eventStatusOf('concluded', [])).toBeNull();
  });
  it('Event con offerte dal catalogo e testo sicuro nello script', () => {
    const ld = eventJsonLd(concerto, { url: '/eventi/concerto-natale-2026', offers: [{ name: 'Ingresso', priceCents: 500, available: true }] });
    expect(ld.offers?.[0]).toMatchObject({ price: '5.00', availability: 'https://schema.org/InStock' });
    expect(jsonLdText({ a: '</script>' })).not.toContain('</script>');
  });
});
