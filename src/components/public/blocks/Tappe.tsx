import { AlertCircle, MapPin, Wine } from 'lucide-react';
import type { BlockProps } from './schema';
import { display, section, wrap } from './ui';

const hex = (c: string) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : 'var(--brand)');

/** Tappe del percorso (A&P): numero, luogo, descrizione, allergeni e la degustazione abbinata. */
export function Tappe({ props }: { props: BlockProps<'Tappe'> }) {
  if (!props.items.length) return null;
  return (
    <section id="tappe" className={`${section} scroll-mt-32`}>
      <div className={wrap}>
        <div className="mx-auto mb-12 max-w-xl text-center">
          {props.eyebrow && <p className="mb-4 inline-block rounded-full bg-[var(--brand-soft)] px-4 py-2 text-[0.85rem] font-bold uppercase tracking-wider text-[var(--brand)]">{props.eyebrow}</p>}
          <h2 className={`${display} text-[clamp(2.2rem,7vw,3.5rem)] font-bold leading-tight text-[var(--brand-ink)]`}>{props.title || 'Le tappe'}</h2>
        </div>
        <ol className="grid gap-6 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {props.items.map((t, i) => (
            <li key={i} className="flex flex-col overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
              <span aria-hidden className={`${display} mb-6 flex size-10 items-center justify-center rounded-xl text-[1.25rem] font-extrabold text-white`} style={{ background: hex(t.color) }}>
                {t.number || i + 1}
              </span>
              <div className="flex-1">
                <h3 className={`${display} mb-3 text-[1.6rem] leading-tight text-[var(--brand-ink)]`}>
                  <span className="sr-only">Tappa {t.number || i + 1}: </span>
                  {t.title}
                </h3>
                {t.location && (
                  <p className="mb-4 flex items-center gap-2 text-[0.9rem] font-medium text-[var(--brand-ink-soft)]">
                    <MapPin size={16} aria-hidden />
                    {t.mapsUrl ? (
                      <a href={t.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        {t.location}
                      </a>
                    ) : (
                      t.location
                    )}
                  </p>
                )}
                {t.description && <p className="mb-6 whitespace-pre-line text-[1.05rem] leading-relaxed text-[var(--brand-ink-soft)]">{t.description}</p>}
                {t.allergens && (
                  <p className="mb-6 flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-[0.85rem] text-amber-800">
                    <AlertCircle size={16} className="shrink-0" aria-hidden />
                    <span>
                      <strong>Allergeni:</strong> {t.allergens}
                    </span>
                  </p>
                )}
              </div>
              {(t.tasting || t.producer) && (
                <div className="mt-auto flex items-start gap-3 border-t border-gray-100 pt-6">
                  <span aria-hidden className="rounded-xl bg-pink-100 p-2 text-pink-600">
                    <Wine size={20} />
                  </span>
                  <div>
                    <p className="text-[0.8rem] font-bold uppercase tracking-wider text-[var(--brand-ink-soft)]">In degustazione</p>
                    <p className="text-[1.1rem] font-bold leading-tight text-[var(--brand-ink)]">{t.tasting}</p>
                    {t.producer && <p className="mt-0.5 text-[0.9rem] text-[var(--brand-ink-soft)]">{t.producer}</p>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
