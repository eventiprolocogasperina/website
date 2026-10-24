import Image from 'next/image';
import { Markup } from './markup';
import type { BlockProps } from './schema';
import { card, display, section, wrap } from './ui';

/**
 * Testo libero con titolo e fino a quattro immagini. "Riquadro" è il riquadro tratteggiato del
 * programma di Zuccaland, "Scheda" la scheda bianca della storia di A&P.
 */
export function RichText({ props }: { props: BlockProps<'RichText'> }) {
  const center = props.align === 'centro';
  const box =
    props.look === 'riquadro'
      ? 'rounded-3xl border-2 border-dashed border-[var(--brand-border)] bg-[var(--brand-soft)] p-5 text-[clamp(0.95rem,3vw,1.15rem)] font-medium text-[var(--brand-strong)] shadow-[0_10px_30px_color-mix(in_srgb,var(--brand)_10%,transparent)] @3xl:p-10'
      : props.look === 'scheda'
        ? `${card} text-[1.1rem] text-[var(--brand-ink-soft)]`
        : 'text-[1.1rem] text-[var(--brand-ink-soft)]';
  return (
    <section className={section}>
      <div className={`${wrap} ${props.look === 'riquadro' ? 'max-w-3xl' : ''}`}>
        <div className={props.look === 'riquadro' ? '' : box}>
          {props.eyebrow && <p className={`mb-2 text-label font-bold uppercase tracking-wider text-[var(--brand)] ${center ? 'text-center' : ''}`}>{props.eyebrow}</p>}
          {props.title && (
            <h2 className={`${display} mb-6 text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight text-[var(--brand)] ${center || props.look === 'riquadro' ? 'text-center' : ''}`}>{props.title}</h2>
          )}
          <div className={props.look === 'riquadro' ? box : ''}>
            <Markup text={props.body} className={`leading-relaxed ${center ? 'text-center' : ''} ${props.body.length > 600 && props.look !== 'riquadro' ? '@3xl:columns-2 @3xl:gap-8' : ''}`} />
          </div>
        </div>
        {props.images.some(Boolean) && (
          <div className="mt-6 grid gap-6 @2xl:grid-cols-2">
            {props.images.filter(Boolean).map((src, i) => (
              <div key={src + i} className="relative h-[350px] overflow-hidden rounded-[2rem] bg-[var(--brand-soft)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
