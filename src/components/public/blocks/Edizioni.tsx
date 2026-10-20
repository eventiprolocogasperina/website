import { ArrowRight } from 'lucide-react';
import type { BlockProps } from './schema';
import type { BlockData } from './types';
import { h2, section } from './ui';

/** Elenco "Edizioni passate" del format, con link a /<format>/<anno> (§13.3). */
export function Edizioni({ props, data }: { props: BlockProps<'Edizioni'>; data: BlockData }) {
  if (!data.editions.length) return null;
  return (
    <section className={section}>
      <div className="mx-auto max-w-3xl">
        <h2 className={h2}>{props.title || 'Edizioni passate'}</h2>
        <ul className="grid gap-3 @2xl:grid-cols-2">
          {data.editions.map((e) => (
            <li key={e.href}>
              <a href={e.href} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 font-bold text-[var(--brand-ink)] shadow-sm hover:bg-[var(--brand-soft)]">
                <span>
                  {e.title}
                  {e.current && <span className="ml-2 rounded-full bg-[var(--brand)] px-2 py-0.5 text-[0.7rem] font-extrabold uppercase text-[var(--brand-fg)]">In corso</span>}
                </span>
                <ArrowRight size={18} className="text-[var(--brand)]" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
