// Resa dei modelli email (prompt 18). Funzioni pure: il testo scritto in admin è sempre escapato,
// le variabili pure, e l'unico markup ammesso è **grassetto**, paragrafi e a capo.
import { TEMPLATE_DEFAULTS, VARIABLES, type TemplateKey, type TemplateVars } from './defaults';

const VAR = /\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/g;

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Variabili usate nel testo che il sito non conosce: l'editor le rifiuta. */
export function unknownVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VAR)].map((m) => m[1]).filter((k) => !(k in VARIABLES)))];
}

/** Toglie lo spazio lasciato da una variabile vuota: "Ciao , grazie" → "Ciao, grazie". */
const tidy = (s: string) => s.replace(/[ \t]+([,.;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ');

/** Testo semplice (oggetto e versione testuale): variabili sostituite, ** tolti. */
export function renderText(text: string, vars: TemplateVars): string {
  return tidy(text.replace(VAR, (_m, k: string) => vars[k as keyof TemplateVars] ?? '').replace(/\*\*(.+?)\*\*/g, '$1'));
}

/** Corpo in HTML: paragrafi <p>, a capo <br>, **grassetto**; testo e variabili escapati. */
export function renderBodyHtml(body: string, vars: TemplateVars, paragraphStyle = ''): string {
  const style = paragraphStyle ? ` style="${paragraphStyle}"` : '';
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => {
      const html = tidy(escapeHtml(p).replace(VAR, (_m, k: string) => escapeHtml(vars[k as keyof TemplateVars] ?? '')))
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return `<p${style}>${html}</p>`;
    })
    .join('\n');
}

export const PARAGRAPH_STYLE = 'font-size:15px;line-height:1.5;margin:0 0 12px';

/** Valori d'esempio, per l'anteprima senza un ordine. */
export const exampleVars = (): TemplateVars => Object.fromEntries(Object.entries(VARIABLES).map(([k, v]) => [k, v.example])) as TemplateVars;

/** Email completa (layout semplice dell'associazione) per i modelli diversi dalla conferma. */
export function renderLayoutEmail(key: TemplateKey, t: { subject: string; body: string }, vars: TemplateVars, accent = '#283983'): { subject: string; html: string; text: string } {
  const subject = renderText(t.subject, vars);
  const def = TEMPLATE_DEFAULTS[key];
  const href = def.button ? vars[def.button.href] : undefined;
  const button =
    def.button && href
      ? `<tr><td style="padding:8px 0 24px"><a href="${escapeHtml(href)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(def.button.label)}</a></td></tr>\n`
      : '';
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f5f6f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c2130">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:${accent};padding:20px 32px;color:#ffffff;font-size:14px">Pro Loco Gasperina</td></tr>
<tr><td style="padding:24px 32px 8px"><h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(subject)}</h1>
${renderBodyHtml(t.body, vars, PARAGRAPH_STYLE)}</td></tr>
<tr><td style="padding:0 32px"><table role="presentation" cellpadding="0" cellspacing="0">${button}</table></td></tr>
<tr><td style="padding:0 32px 24px;font-size:12px;color:#666d80">Pro Loco Gasperina APS · rispondi a questa email per qualsiasi domanda.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${subject}\n\n${renderText(t.body, vars)}\n${def.button && href ? `\n${def.button.label}: ${href}\n` : ''}`;
  return { subject, html, text };
}
