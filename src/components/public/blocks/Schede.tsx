import { display, h2, section } from './ui';
import type { BlockProps } from './schema';

const DEFAULT_COLOR = '#fed7aa';
/** Solo colori esadecimali: il colore finisce in uno stile in linea. */
const color = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : DEFAULT_COLOR);

/**
 * Schede con emoji, titolo, testo e voci a pillola: le "info card" di Zuccaland (laboratori, giochi,
 * cibo). La versione compatta è quella dei punti in evidenza (merchandising, musica).
 */
export function Schede({ props }: { props: BlockProps<'Schede'> }) {
  if (!props.items.length) return null;
  if (props.look === 'compatte') {
    return (
      <section className="px-4 pb-10">
        {props.title && <h2 className={h2}>{props.title}</h2>}
        <ul className="mx-auto grid max-w-[780px] gap-4 @2xl:grid-cols-2">
          {props.items.map((it, i) => (
            <li key={i} className="flex items-center gap-3.5 rounded-[1.25rem] border-[1.5px] border-[color-mix(in_srgb,var(--brand-border)_45%,white)] bg-white/75 px-5 py-4 shadow-[0_2px_10px_rgba(124,45,18,0.03)]">
              <span aria-hidden className="flex size-[42px] shrink-0 items-center justify-center rounded-[0.85rem] border border-[color-mix(in_srgb,var(--brand)_15%,transparent)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)] text-[1.3rem]">
                {it.emoji || '✨'}
              </span>
              <div>
                <h3 className="text-[0.96rem] font-bold text-[var(--brand-ink)]">{it.title}</h3>
                {it.text && <p className="text-[0.82rem] leading-snug text-[var(--brand-ink-soft)] opacity-85">{it.text}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section id="attivita" className={`${section} scroll-mt-32`}>
      {props.title && <h2 className={h2}>{props.title}</h2>}
      <ul className="mx-auto grid max-w-[1200px] gap-5 @3xl:grid-cols-2 @5xl:grid-cols-3">
        {props.items.map((it, i) => {
          const c = color(it.color);
          return (
            <li key={i} className="relative flex flex-col overflow-hidden rounded-3xl border-[3px] border-white bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] @3xl:p-8">
              <div aria-hidden className="absolute -right-8 -top-8 size-40 rounded-full opacity-25 blur-[35px]" style={{ background: c }} />
              <div className="relative mb-3 flex items-center gap-3.5">
                <span aria-hidden className="flex size-[52px] shrink-0 items-center justify-center rounded-[0.9rem] text-[2.2rem]" style={{ background: `${c}66` }}>
                  {it.emoji}
                </span>
                <h3 className={`${display} text-[1.3rem] font-extrabold leading-tight text-[var(--brand-ink)]`}>{it.title}</h3>
              </div>
              {it.text && <p className="relative mb-4 text-[0.88rem] font-medium leading-normal text-[var(--brand-ink-soft)]">{it.text}</p>}
              {it.chips.some(Boolean) && (
                <ul className="relative flex flex-wrap content-start gap-[0.45rem]">
                  {it.chips.filter(Boolean).map((chip, j) => (
                    <li key={j} className="rounded-full border-[1.5px] px-3 py-1.5 text-[0.8rem] font-semibold leading-snug text-[var(--brand-ink)]" style={{ background: `${c}40`, borderColor: `${c}80` }}>
                      {chip}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
