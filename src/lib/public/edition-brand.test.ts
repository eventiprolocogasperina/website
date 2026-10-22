import { describe, expect, it } from 'vitest';
import { editionTheme, editionThemeStyle, readBrand } from '@/lib/edition-theme';
import { editionLinks } from './edition-links';

describe('readBrand', () => {
  it('legge logo, icona e font del format', () => {
    const b = readBrand({ dot: 'orange', logo: '/img/zuccaland/Logo.png', mark: '/img/zuccaland/Pumpink.png', fontDisplay: 'cormorant' });
    expect(b).toEqual({ dot: 'orange', logo: '/img/zuccaland/Logo.png', logoOnDark: '/img/zuccaland/Logo.png', mark: '/img/zuccaland/Pumpink.png', fontDisplay: 'cormorant', fontBody: 'dm-sans' });
  });

  it('scarta valori non validi senza rompere la pagina', () => {
    expect(readBrand(null)).toEqual({ dot: 'gray', logo: null, logoOnDark: null, mark: null, fontDisplay: 'sans', fontBody: 'dm-sans' });
    const b = readBrand({ dot: 'viola', logo: 'javascript:alert(1)', logoOnDark: '//evil.example/x.png', mark: 'img/rel.png', fontDisplay: 'comic', fontBody: 42 });
    expect(b).toEqual({ dot: 'gray', logo: null, logoOnDark: null, mark: null, fontDisplay: 'sans', fontBody: 'dm-sans' });
    expect(readBrand({ logo: '/img/a.png" onerror="x' }).logo).toBeNull();
    expect(readBrand({ logo: 'https://res.cloudinary.com/x/logo.png' }).logo).toBe('https://res.cloudinary.com/x/logo.png');
  });
});

describe('palette del format', () => {
  it('Zuccaland: arancio pieno per le superfici, arancio scuro per il testo', () => {
    const t = editionTheme('orange');
    expect(t.brand).toBe('#ea580c');
    expect(t.accent).toBe('#c2410c');
    expect(editionThemeStyle('orange', readBrand({ fontDisplay: 'cormorant' }))).toMatchObject({ '--ev-brand': '#ea580c', '--ev-font-display': expect.stringContaining('Cormorant') });
  });
});

describe('editionLinks', () => {
  const allegati = { id: 'a', type: 'Allegati', props: { items: [{ label: 'Locandina', url: '/l.pdf' }, { label: 'Regolamento ufficiale', url: '/r.pdf' }] } };
  it('trova regolamento e mappa nei blocchi, prima dell’edizione poi del format', () => {
    const mappa = { id: 'm', type: 'Mappa', props: { address: 'Parco comunale', lat: 38.5, lng: 16.5 } };
    expect(editionLinks([allegati], [mappa])).toEqual({ rulesUrl: '/r.pdf', map: { address: 'Parco comunale', url: 'https://www.google.com/maps/search/?api=1&query=38.5%2C16.5' } });
  });
  it('ignora blocchi nascosti o non validi', () => {
    expect(editionLinks([{ ...allegati, hidden: true }, { type: 'Mappa', props: {} }, 'x'])).toEqual({ rulesUrl: null, map: null });
    expect(editionLinks(null, undefined)).toEqual({ rulesUrl: null, map: null });
  });
});
