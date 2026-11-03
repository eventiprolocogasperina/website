import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FormattedText from './FormattedText';

const render = (text: string) => renderToStaticMarkup(createElement(FormattedText, { text }));

describe('FormattedText', () => {
  it('keeps bold, italic and safe links', () => {
    const html = render('**Zuccaland** è *magica*: [biglietti](https://www.prolocogasperina.it/eventi)');
    expect(html).toContain('<strong>Zuccaland</strong>');
    expect(html).toContain('<em>magica</em>');
    expect(html).toContain('href="https://www.prolocogasperina.it/eventi"');
  });

  it('never turns stored text into HTML (audit lead 3)', () => {
    const html = render('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('drops javascript: links but keeps their label', () => {
    const html = render('[clicca](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('clicca');
  });
});
