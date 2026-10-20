import { newBlock, type Block } from '@/components/public/blocks/schema';
import type { AssaggiaEPasseggiaContent, ZuccalandContent } from '@/lib/data/pages';

/*
 * Conversione dei contenuti di oggi (pages_content) in blocchi (prompt 17, punto 6). Funzioni pure:
 * le usa scripts/convert-pages-to-blocks.ts e le provano i test. I prezzi NON si copiano: il blocco
 * Prezzi li legge dal catalogo (§13.4), quindi `ticketTypes` e `presale.priceInfo` restano fuori.
 */

const HIGHLIGHT_EMOJI: Record<string, string> = { 'shopping-bag': '🛍️', music: '🎵', coffee: '☕', star: '⭐', gift: '🎁' };

/** Pagina dell'edizione Zuccaland 2026, nello stesso ordine di ZuccalandClient. */
export function zuccalandEditionBlocks(c: ZuccalandContent): Block[] {
  return [
    newBlock('Hero', { logoUrl: '/img/zuccaland/Logo.png', title: c.hero.title, subtitle: c.hero.subtitle, description: c.hero.description, badge: c.hero.badge, ctaLabel: 'Acquista il tuo Biglietto' }),
    newBlock('Schede', { look: 'grandi', items: c.infoCards.map((i) => ({ emoji: i.emoji, title: i.title, text: i.description, color: i.color, chips: i.items })) }),
    newBlock('Schede', { look: 'compatte', items: c.highlights.map((h) => ({ emoji: HIGHLIGHT_EMOJI[h.icon] ?? '✨', title: h.title, text: h.description, color: '', chips: [] })) }),
    newBlock('CTAAcquisto', {
      title: 'Ogni visitatore ha bisogno del suo biglietto',
      text: 'Adulti e bambini: seleziona il numero totale di ingressi che ti serve. I laboratori gratuiti per i più piccoli potrai sceglierli nel passaggio successivo.',
      label: 'Acquista Biglietti',
      showFromPrice: false,
    }),
    newBlock('Programma', { title: c.program.title, intro: c.program.content }),
    newBlock('CTAAcquisto', { title: c.tickets.title, text: 'Scegli il giorno, i biglietti e le attività: ricevi subito i biglietti per email.' }),
    newBlock('Prezzi', { title: 'Biglietti', note: c.tickets.disclaimer }),
    newBlock('FAQ', { title: 'Domande Frequenti', intro: 'Tutte le informazioni importanti su gratuità bambini, biglietti, rinvio meteo e condizioni di rimborso.', items: c.faqs ?? [] }),
    newBlock('Allegati', {
      title: 'Hai altre domande o necessiti di supporto?',
      items: [
        { label: 'Regolamento (PDF)', url: 'https://drive.google.com/file/d/1jaJ8vUe_ePAJubcM-dwLufVJ9Z8GgujK/view?usp=share_link' },
        { label: 'Modulo rimborso', url: '/zuccaland/rimborso' },
        { label: 'Scrivici', url: '/contatti' },
      ],
    }),
  ];
}

/** Pagina fuori stagione di Zuccaland (§13.3): non esiste oggi, si compone dai contenuti dell'edizione. */
export function zuccalandOffseasonBlocks(c: ZuccalandContent): Block[] {
  return [
    newBlock('Hero', { logoUrl: '/img/zuccaland/Logo.png', title: 'Zuccaland', subtitle: c.hero.subtitle, description: 'Grazie a tutti! Ci vediamo alla prossima edizione 🧡' }),
    newBlock('RichText', { title: 'Cos’è Zuccaland', body: c.hero.description, align: 'centro' }),
    newBlock('Schede', { look: 'grandi', items: c.infoCards.map((i) => ({ emoji: i.emoji, title: i.title, text: i.description, color: i.color, chips: [] })) }),
    newBlock('NumeriChiave', { title: 'L’ultima edizione', items: [] }),
    newBlock('Galleria', { title: 'Le edizioni passate in foto', category: 'zuccaland' }),
    newBlock('Recensioni', { source: 'zuccaland' }),
    newBlock('Edizioni', {}),
    newBlock('Avvisami', { nextDate: 'ottobre 2027' }),
    newBlock('Sponsor', {}),
  ];
}

const location = (l: AssaggiaEPasseggiaContent['tappe'][number]['location']) => (typeof l === 'string' ? { name: l, url: '' } : { name: l?.name ?? 'Gasperina', url: l?.googleMapsUrl ?? '' });

/** Pagina dell'edizione A&P 2026 (oggi /assaggia-e-passeggia/edizione-2026). */
export function assaggiaEditionBlocks(c: AssaggiaEPasseggiaContent): Block[] {
  const tappe = c.tappe.map((t) => {
    const l = location(t.location);
    return { number: t.id, title: t.title, description: t.description, location: l.name, mapsUrl: /^https?:\/\//.test(l.url) ? l.url : '', tasting: t.wineName, producer: t.wineryName, allergens: t.allergens ?? '', color: /^#/.test(t.themeColor) ? t.themeColor : '' };
  });
  return [
    newBlock('Hero', { logoUrl: '/img/LogoAP_GA_nero.png', title: c.hero.title || 'Assaggia & Passeggia', subtitle: c.hero.subtitle, badge: c.hero.badge, imageUrl: /^(https:\/\/|\/)/.test(c.hero.bgImageUrl) ? c.hero.bgImageUrl : '', ctaLabel: c.hero.ctaText, ctaHref: /^(https?:\/\/|\/|#)/.test(c.hero.ctaLink) ? c.hero.ctaLink : '' }),
    ...(c.hero.heroVideoUrl ? [newBlock('Video', { url: c.hero.heroVideoUrl })] : []),
    newBlock('Sponsor', { title: 'Con il sostegno di' }),
    newBlock('RichText', { title: c.story.title, body: [c.story.paragraph1, c.story.paragraph2].filter(Boolean).join('\n\n'), images: [c.story.image1Url, c.story.image2Url].filter((u) => /^(https:\/\/|\/)/.test(u ?? '')) }),
    newBlock('Tappe', { eyebrow: c.menu.subtitle, title: c.menu.title, items: tappe }),
    newBlock('RichText', {
      title: 'Info pratiche',
      body: [`## Ritiro kit\n${c.logistics.ticketInfo}`, `## Parcheggi\n${c.logistics.parkingInfo}`, `## Intolleranze\n${c.logistics.disclaimer}`].join('\n\n'),
    }),
    newBlock('CTAAcquisto', { title: c.presale.title, text: c.presale.subtitle, label: c.presale.ctaText }),
    newBlock('FAQ', { title: 'Domande Frequenti', items: c.faqs ?? [] }),
  ];
}

/** Pagina fuori stagione di A&P: la pagina "Grazie" di oggi più le sezioni del §13.3. */
export function assaggiaOffseasonBlocks(photos: Array<{ src: string }>): Block[] {
  return [
    newBlock('Hero', { title: 'Grazie!', subtitle: 'L’edizione di Assaggia & Passeggia è stata un successo. Ci vediamo il prossimo anno per brindare ancora insieme.', logoUrl: '/img/LogoAP_GA_nero.png' }),
    newBlock('Galleria', { title: 'I Ricordi', subtitle: 'Le foto dell’edizione 2026', category: 'assaggia26', photos: photos.slice(0, 24).map((p) => ({ src: p.src, alt: 'Assaggia & Passeggia 2026' })), limit: 24 }),
    newBlock('Recensioni', { title: 'Le vostre recensioni', source: 'assaggia-passeggia' }),
    newBlock('Edizioni', {}),
    newBlock('Avvisami', {}),
    newBlock('Sponsor', {}),
  ];
}
