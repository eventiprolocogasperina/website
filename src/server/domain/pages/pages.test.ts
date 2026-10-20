import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { moveItem } from '@/components/admin/page-editor/BlockList';
import { BLOCK_META } from '@/components/admin/page-editor/fields';
import { BLOCK_SCHEMAS, BLOCK_TYPES, blockDefaults, newBlock, PageBlocksSchema, readBlocks } from '@/components/public/blocks/schema';
import { Markup } from '@/components/public/blocks/markup';
import { youtubeId } from '@/components/public/blocks/Extras';
import { DEFAULT_ASSAGGIA_CONTENT, DEFAULT_ZUCCALAND_CONTENT } from '@/lib/data/pages';
import { assaggiaEditionBlocks, assaggiaOffseasonBlocks, zuccalandEditionBlocks, zuccalandOffseasonBlocks } from './convert';

vi.mock('server-only', () => ({}));
const { pickCurrentEdition } = await import('./resolve');

describe('schema dei blocchi', () => {
  it('ogni tipo ha valori predefiniti validi e un editor', () => {
    for (const t of BLOCK_TYPES) {
      expect(() => BLOCK_SCHEMAS[t].parse(blockDefaults(t))).not.toThrow();
      expect(BLOCK_META[t].fields.length).toBeGreaterThan(0);
      for (const f of BLOCK_META[t].fields) expect(Object.keys(blockDefaults(t))).toContain(f.key);
    }
  });

  it('readBlocks scarta i blocchi non validi e tiene gli altri', () => {
    const ok = newBlock('FAQ', { items: [{ question: 'Q', answer: 'A' }] });
    expect(readBlocks([ok, { id: 'x', type: 'Sconosciuto', props: {} }, { id: 'y', type: 'Hero', props: { logoUrl: 'javascript:alert(1)' } }, null])).toEqual([ok]);
    expect(readBlocks('nope')).toEqual([]);
  });

  it('rifiuta link pericolosi e troppi blocchi', () => {
    expect(PageBlocksSchema.safeParse([{ id: 'a', type: 'Video', props: { url: 'javascript:x' } }]).success).toBe(false);
    expect(PageBlocksSchema.safeParse(Array.from({ length: 61 }, (_, i) => newBlock('Sponsor')).map((b, i) => ({ ...b, id: `b${i}` }))).success).toBe(false);
  });
});

describe('testo formattato', () => {
  const html = (text: string) => renderToStaticMarkup(createElement(Markup, { text }));
  it('grassetto, link ed elenchi senza HTML grezzo', () => {
    expect(html('**Ciao** <script>x</script>')).toContain('<strong>Ciao</strong> &lt;script&gt;');
    expect(html('[sito](https://a.it)')).toContain('href="https://a.it"');
    expect(html('[x](javascript:alert(1))')).not.toContain('href');
    expect(html('- uno\n- due')).toContain('<ul');
  });
});

describe('aiuti', () => {
  it('moveItem sposta e ignora indici fuori', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    expect(moveItem([1, 2], 0, 5)).toEqual([1, 2]);
  });
  it('youtubeId', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://vimeo.com/1')).toBeNull();
  });
  it('edizione in corso: live > on_sale > sold_out > published, poi la più vicina', () => {
    const e = (status: string, d: string) => ({ status, startsAt: new Date(d) }) as Parameters<typeof pickCurrentEdition>[0][number];
    expect(pickCurrentEdition([e('published', '2027-10-01'), e('on_sale', '2026-10-17')])?.status).toBe('on_sale');
    expect(pickCurrentEdition([e('published', '2028-10-01'), e('published', '2027-10-01')])?.startsAt?.getFullYear()).toBe(2027);
    expect(pickCurrentEdition([e('archived', '2025-10-01'), e('concluded', '2026-10-01')])).toBeNull();
  });
});

describe('conversione delle pagine di oggi', () => {
  it('Zuccaland: tutte le sezioni, prezzi non copiati', () => {
    const blocks = zuccalandEditionBlocks(DEFAULT_ZUCCALAND_CONTENT);
    expect(PageBlocksSchema.parse(blocks)).toHaveLength(blocks.length);
    expect(blocks.map((b) => b.type)).toEqual(['Hero', 'Schede', 'Schede', 'CTAAcquisto', 'Programma', 'CTAAcquisto', 'Prezzi', 'FAQ', 'Allegati']);
    const faq = blocks.find((b) => b.type === 'FAQ');
    expect(faq?.type === 'FAQ' && faq.props.items.length).toBe(DEFAULT_ZUCCALAND_CONTENT.faqs!.length);
    expect(JSON.stringify(blocks)).not.toContain('"price"');
    expect(PageBlocksSchema.parse(zuccalandOffseasonBlocks(DEFAULT_ZUCCALAND_CONTENT)).some((b) => b.type === 'Avvisami')).toBe(true);
  });
  it('A&P: tappe, info pratiche e pagina fuori stagione', () => {
    const blocks = readBlocks(PageBlocksSchema.parse(assaggiaEditionBlocks(DEFAULT_ASSAGGIA_CONTENT)));
    const tappe = blocks.find((b) => b.type === 'Tappe');
    expect(tappe?.type === 'Tappe' && tappe.props.items.length).toBe(DEFAULT_ASSAGGIA_CONTENT.tappe.length);
    const off = PageBlocksSchema.parse(assaggiaOffseasonBlocks([{ src: '/img/a.webp' }]));
    expect(off.map((b) => b.type)).toEqual(['Hero', 'Galleria', 'Recensioni', 'Edizioni', 'Avvisami', 'Sponsor']);
  });
});
