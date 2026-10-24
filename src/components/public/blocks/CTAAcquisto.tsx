import { ArrowRight, Ticket } from 'lucide-react';
import type { BlockProps } from './schema';
import type { BlockData } from './types';
import { display, euro } from './ui';

/**
 * Blocco "Acquista" (§13.4): porta al checkout unico /acquista/[edition].
 * Versione minima del prompt 13, usata ancora da ZuccalandClient con NUOVO_CHECKOUT=1.
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

/** Perché non si compra: lo stato dell'edizione decide il messaggio. */
function closedText(status: string | undefined): string {
  if (status === 'sold_out') return 'I biglietti sono esauriti. Grazie a tutti!';
  if (status === 'concluded' || status === 'archived') return 'Questa edizione si è conclusa.';
  return 'La vendita dei biglietti non è ancora aperta.';
}

/** Blocco della pagina a blocchi: titolo, testo, "a partire da" letto dal catalogo e pulsante. */
export function CTAAcquistoBlock({ props, data }: { props: BlockProps<'CTAAcquisto'>; data: BlockData }) {
  const entry = data.prices.filter((p) => !p.extra);
  const from = entry.length ? Math.min(...entry.map((p) => p.priceCents)) : null;
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand-strong)_100%)] px-6 py-10 text-center text-[var(--brand-fg)] shadow-[0_15px_40px_color-mix(in_srgb,var(--brand)_25%,transparent)] @3xl:px-12">
        <h2 className={`${display} text-[clamp(1.8rem,5vw,2.6rem)] font-bold leading-tight`}>{props.title || 'Riserva il tuo posto!'}</h2>
        {props.text && <p className="mx-auto mt-3 max-w-xl text-[1rem] font-medium leading-relaxed opacity-90">{props.text}</p>}
        {props.showFromPrice && from !== null && (
          <p className={`${display} mt-6 text-[clamp(2.6rem,9vw,4rem)] font-bold leading-none text-[var(--brand-fg)]`}>
            {entry.length > 1 ? <span className="mr-2 align-middle text-[1.1rem] font-semibold text-[var(--brand-fg)] opacity-80">da</span> : null}
            {euro(from)}
            <span className="ml-1 align-middle font-sans text-[1.1rem] font-medium text-[var(--brand-fg)] opacity-70">/ pers.</span>
          </p>
        )}
        {data.checkoutHref ? (
          <a
            href={data.checkoutHref}
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 py-3 text-[1.05rem] font-extrabold text-[var(--brand)] no-underline shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Ticket size={19} aria-hidden /> {props.label || 'Acquista i biglietti'} <ArrowRight size={17} aria-hidden />
          </a>
        ) : (
          <p role="status" className="mt-6 inline-block rounded-full bg-white/15 px-5 py-2.5 font-semibold">
            {closedText(data.edition?.status)}
          </p>
        )}
      </div>
    </section>
  );
}

/** Prezzi dal catalogo: mai scritti a mano nei blocchi (§13.4). */
export function Prezzi({ props, data }: { props: BlockProps<'Prezzi'>; data: BlockData }) {
  const rows = data.prices.filter((p) => props.showExtras || !p.extra);
  if (!rows.length) return null;
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h2 className={`${display} mb-6 text-center text-[clamp(1.8rem,5vw,2.5rem)] font-bold text-[var(--brand)]`}>{props.title || 'Prezzi'}</h2>
        <ul className="grid gap-3">
          {rows.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-4 rounded-2xl border-2 border-white bg-white p-5 shadow-sm">
              <div>
                <p className="font-extrabold text-[var(--brand-ink)]">
                  {p.name}
                  {p.extra && <span className="ml-2 rounded-full bg-[var(--brand-accent)] px-2 py-0.5 align-middle text-[0.68rem] font-extrabold tracking-wide text-white">EXTRA</span>}
                </p>
                {p.description && <p className="mt-1 text-[0.9rem] leading-snug text-[var(--brand-ink-soft)]">{p.description}</p>}
              </div>
              <span className="shrink-0 text-[1.3rem] font-black tabular-nums text-[var(--brand)]">{p.priceCents === 0 ? 'Gratis' : euro(p.priceCents)}</span>
            </li>
          ))}
        </ul>
        {props.note && <p className="mt-4 text-center text-[0.88rem] font-medium text-[var(--brand-ink-soft)]">{props.note}</p>}
      </div>
    </section>
  );
}
