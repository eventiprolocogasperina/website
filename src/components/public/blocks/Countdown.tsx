'use client';

import { useEffect, useState } from 'react';
import type { BlockProps } from './schema';
import { display } from './ui';

const UNITS = [
  ['giorni', 86_400_000],
  ['ore', 3_600_000],
  ['min', 60_000],
  ['sec', 1000],
] as const;

function parts(ms: number) {
  let rest = Math.max(0, ms);
  return UNITS.map(([label, size]) => {
    const n = Math.floor(rest / size);
    rest -= n * size;
    return { label, n };
  });
}

/**
 * Conto alla rovescia verso una data (apertura vendite o inizio). Prima dell'idratazione mostra i
 * riquadri vuoti con la stessa altezza, così la pagina non si sposta.
 */
export function Countdown({ props }: { props: BlockProps<'Countdown'> }) {
  const target = Date.parse(props.target);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => (clearTimeout(first), clearInterval(t));
  }, []);
  if (Number.isNaN(target)) return null;
  const done = now !== null && now >= target;
  return (
    <section className="px-4 py-10 text-center">
      {props.title && <h2 className={`${display} mb-5 text-[clamp(1.5rem,4.5vw,2rem)] font-bold text-[var(--brand)]`}>{props.title}</h2>}
      {done ? (
        <p className="text-[1.1rem] font-bold text-[var(--brand-ink)]">{props.doneText || 'Ci siamo!'}</p>
      ) : (
        <ol className="mx-auto flex max-w-md justify-center gap-2.5" aria-live="off">
          {parts(now === null ? 0 : target - now).map((p) => (
            <li key={p.label} className="flex min-w-[4.2rem] flex-col items-center rounded-2xl bg-white px-2 py-3 shadow-[0_6px_20px_color-mix(in_srgb,var(--brand)_12%,transparent)]">
              <span className="text-[1.8rem] font-black tabular-nums leading-none text-[var(--brand)]">{now === null ? '–' : String(p.n).padStart(2, '0')}</span>
              <span className="mt-1 text-[0.72rem] font-bold uppercase tracking-wide text-[var(--brand-ink-soft)]">{p.label}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
