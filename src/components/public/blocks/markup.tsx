import { Fragment, type ReactNode } from 'react';

/*
 * Testo formattato dei blocchi, senza HTML: paragrafi separati da una riga vuota, "## " per un
 * sottotitolo, "- " per un elenco, **grassetto**, *corsivo* e [testo](https://…). Produce nodi React,
 * quindi quello che scrive l'admin non può mai iniettare HTML o script nella pagina pubblica.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

/** Solo link del sito, http(s), email o telefono: niente javascript: e simili. */
export const safeHref = (url: string) => (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url) ? url : null);

export function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]);
      return href ? (
        <a key={i} href={href} className="font-semibold underline hover:opacity-80" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {link[1]}
        </a>
      ) : (
        <Fragment key={i}>{link[1]}</Fragment>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Spezza il testo in paragrafi, sottotitoli ed elenchi. */
export function Markup({ text, className }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const all = b.split('\n').filter((l) => l.trim());
        if (!all.length) return null;
        // "## Titolo" in testa al paragrafo: sottotitolo, poi il resto del paragrafo.
        const heading = all[0].startsWith('## ') && all.length > 1 ? all[0] : null;
        const lines = heading ? all.slice(1) : all;
        if (heading) {
          return (
            <div key={i}>
              <h3 className="mb-1 mt-5 text-[1.1rem] font-bold text-[var(--brand-ink)]">{inline(heading.slice(3))}</h3>
              <p className="my-0">{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>
            </div>
          );
        }
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="my-3 list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        if (lines.length === 1 && lines[0].startsWith('## ')) {
          return (
            <h3 key={i} className="mb-2 mt-5 text-[1.2rem] font-bold">
              {inline(lines[0].slice(3))}
            </h3>
          );
        }
        return (
          <p key={i} className="my-3 first:mt-0 last:mb-0">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
