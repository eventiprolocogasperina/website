import { Ticket } from 'lucide-react';

/**
 * Blocco "Acquista" (§13.4): porta al checkout unico /acquista/[edition].
 * Versione minima del prompt 13; il blocco completo (prezzi dal catalogo, posti rimasti) arriva con il prompt 17.
 */
export function CTAAcquisto({ edition, title = 'Biglietti', text, label = 'Acquista i biglietti' }: { edition: string; title?: string; text?: string; label?: string }) {
  return (
    <section id="acquista" className="ui-root px-4 py-16 text-center" style={{ scrollMarginTop: '7rem' }}>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <h2 className="text-3xl font-semibold">{title}</h2>
        {text && <p className="text-section opacity-80">{text}</p>}
        <a
          href={`/acquista/${edition}`}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-section font-semibold text-primary-fg shadow-sm hover:bg-primary-hover"
        >
          <Ticket size={20} aria-hidden /> {label}
        </a>
      </div>
    </section>
  );
}
