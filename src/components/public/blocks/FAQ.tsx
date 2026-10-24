import { ChevronDown } from 'lucide-react';
import { Markup } from './markup';
import type { BlockProps } from './schema';
import { h2, section } from './ui';

/** Domande frequenti: <details> nativi, accessibili da tastiera e senza JavaScript. */
export function FAQ({ props }: { props: BlockProps<'FAQ'> }) {
  if (!props.items.length) return null;
  return (
    <section id="faq" className={`${section} scroll-mt-32`}>
      <div className="mx-auto max-w-3xl">
        <h2 className={h2}>{props.title || 'Domande frequenti'}</h2>
        {props.intro && <p className="-mt-3 mb-6 text-center text-[clamp(0.95rem,2.8vw,1.08rem)] font-medium leading-relaxed text-[var(--brand-ink-soft)]">{props.intro}</p>}
        <div className="flex flex-col gap-3">
          {props.items.map((f, i) => (
            <details key={i} className="group rounded-3xl border-2 border-white bg-white shadow-[0_4px_15px_rgba(0,0,0,0.04)] open:border-[var(--brand-border)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[1.02rem] font-bold text-[var(--brand-ink)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] [&::-webkit-details-marker]:hidden">
                {f.question}
                <ChevronDown size={20} className="shrink-0 text-[var(--brand)] transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <Markup text={f.answer} className="px-5 pb-5 leading-relaxed text-[var(--brand-ink-soft)]" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
