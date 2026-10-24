'use client';

import { useEffect, useState } from 'react';

type Data = { title: string; ready: Array<{ number: number; department: string }> };

const REFRESH_MS = 4000;

/** Numeri pronti da ritirare, a caratteri grandi. Si aggiorna da solo ogni pochi secondi. */
export function ReadyScreen({ slug, initial }: { slug: string; initial: Data }) {
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/cassa/pronti/${slug}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
        setStale(false);
      } catch {
        setStale(true);
      }
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [slug]);

  const departments = [...new Set(data.ready.map((r) => r.department))];

  return (
    <div className="ui-root min-h-dvh bg-bg p-6 text-fg">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-[2.5rem] font-black">Pronti</h1>
        <p className="text-section text-muted">{data.title}</p>
      </header>
      {data.ready.length === 0 ? (
        <p className="mt-24 text-center text-[2rem] text-muted">Nessun ordine pronto in questo momento</p>
      ) : (
        <div className="grid gap-8">
          {departments.map((d) => (
            <section key={d} aria-label={d || 'Ordini'}>
              {departments.length > 1 && <h2 className="mb-3 text-title font-semibold text-muted">{d}</h2>}
              <ul className="flex flex-wrap gap-4">
                {data.ready
                  .filter((r) => r.department === d)
                  .map((r) => (
                    <li key={`${r.number}-${d}`} className="min-w-32 rounded-2xl bg-success-bg px-6 py-4 text-center text-[4rem] leading-none font-black tabular-nums text-success">
                      {r.number}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {stale && <p className="fixed right-4 bottom-4 text-label text-muted">Aggiornamento in pausa: controllo la rete…</p>}
    </div>
  );
}
