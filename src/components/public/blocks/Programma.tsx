import { Markup } from './markup';
import type { BlockProps } from './schema';
import { h2, section } from './ui';

/** Programma: un'introduzione libera e, se ci sono, gli appuntamenti con orario. */
export function Programma({ props }: { props: BlockProps<'Programma'> }) {
  return (
    <section id="programma" className={`${section} scroll-mt-32`}>
      <div className="mx-auto max-w-3xl">
        <h2 className={h2}>{props.title || 'Programma'}</h2>
        <div className="rounded-3xl border-2 border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 text-left text-[clamp(0.95rem,3vw,1.15rem)] font-medium leading-relaxed text-[var(--brand-strong)] shadow-[0_10px_30px_color-mix(in_srgb,var(--brand)_10%,transparent)] @3xl:p-10">
          <Markup text={props.intro} />
          {props.items.length > 0 && (
            <ol className={`space-y-4 ${props.intro ? 'mt-6' : ''}`}>
              {props.items.map((it, i) => (
                <li key={i} className="flex gap-4">
                  {it.when && <span className="min-w-20 shrink-0 font-extrabold tabular-nums text-[var(--brand)]">{it.when}</span>}
                  <div>
                    <p className="font-bold text-[var(--brand-ink)]">{it.title}</p>
                    {it.description && <p className="text-[0.95rem] opacity-90">{it.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
