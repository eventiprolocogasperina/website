// Resa dei modelli email: variabili, escape del testo scritto in admin, grassetto e paragrafi.
import { describe, expect, it } from 'vitest';
import { TEMPLATE_DEFAULTS, TEMPLATE_KEYS } from './defaults';
import { exampleVars, renderBodyHtml, renderLayoutEmail, renderText, unknownVariables } from './render';

describe('modelli email', () => {
  it('sostituisce le variabili e toglie lo spazio di quelle vuote', () => {
    expect(renderText('Ciao {{cliente.nome}}, ordine {{ ordine.codice }}', { 'ordine.codice': 'ZK26-7F3K' })).toBe('Ciao, ordine ZK26-7F3K');
    expect(renderText('**Grazie** {{cliente.nome}}!', { 'cliente.nome': 'Maria' })).toBe('Grazie Maria!');
  });
  it('escapa testo e variabili, ammette solo grassetto e paragrafi', () => {
    const html = renderBodyHtml('<script>x</script> **ok**\nriga\n\n{{cliente.nome}}', { 'cliente.nome': '<img onerror=1>' });
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<strong>ok</strong><br>riga');
    expect(html).toContain('<p>&lt;img onerror=1&gt;</p>');
    expect(html).not.toContain('<script>');
  });
  it('segnala le variabili sconosciute', () => {
    expect(unknownVariables('{{cliente.nome}} {{cliente.iban}} {{x.y}}')).toEqual(['cliente.iban', 'x.y']);
  });
  it('i predefiniti usano solo variabili conosciute e hanno un oggetto', () => {
    for (const k of TEMPLATE_KEYS) {
      const d = TEMPLATE_DEFAULTS[k];
      expect(unknownVariables(`${d.subject}\n${d.body}`), k).toEqual([]);
      const email = renderLayoutEmail(k, d, exampleVars());
      expect(email.subject).not.toContain('{{');
      expect(email.html).not.toContain('{{');
    }
  });
});
