import { ArrowRight, Calendar, Ticket } from 'lucide-react';
import Image from 'next/image';
import type { BlockProps } from './schema';
import type { BlockData } from './types';
import { display, euro, pillButton } from './ui';

/**
 * Copertina della pagina: logo del format (o titolo), sottotitolo, data e pulsante. Con il pulsante
 * senza indirizzo porta alla sezione d'acquisto della pagina, solo se l'edizione vende online.
 * Gli sfondi sfumati riprendono quelli della Zuccaland di oggi con i colori del format.
 */
export function Hero({ props, data }: { props: BlockProps<'Hero'>; data: BlockData }) {
  const href = props.ctaHref || (data.checkoutHref ? '#acquista' : '');
  const entry = data.prices.filter((p) => !p.extra);
  const from = entry.length ? Math.min(...entry.map((p) => p.priceCents)) : null;
  const title = props.title || data.edition?.title || data.series?.name || '';
  return (
    <section className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden px-4 pb-14 pt-28 text-center">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-[5%] size-[45vw] rounded-full opacity-70 blur-[60px]" style={{ background: 'radial-gradient(circle, var(--brand-blob-1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[5%] right-0 size-[55vw] rounded-full opacity-50 blur-[80px]" style={{ background: 'radial-gradient(circle, var(--brand-blob-2) 0%, transparent 70%)' }} />
      </div>
      <div className="relative w-full max-w-[950px]">
        {props.badge && props.imageUrl && (
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-5 py-2 text-[0.85rem] font-bold uppercase tracking-wider text-[var(--brand-fg)] shadow-md">
            <Calendar size={16} className="text-[var(--brand-accent)]" aria-hidden /> {props.badge}
          </p>
        )}
        {props.logoUrl ? (
          <>
            <Image src={props.logoUrl} alt={title} width={1600} height={500} loading="eager" fetchPriority="high" sizes="(max-width: 950px) 100vw, 900px" className="mx-auto h-auto w-full max-w-[900px] object-contain drop-shadow-[0_20px_30px_color-mix(in_srgb,var(--brand)_15%,transparent)]" />
            <h1 className="sr-only">{title}</h1>
          </>
        ) : (
          <h1 className={`${display} text-[clamp(2.8rem,10vw,6rem)] font-bold leading-none text-[var(--brand)]`}>{title}</h1>
        )}
        {props.subtitle && <p className="mx-auto mt-2 max-w-[700px] px-2 text-[clamp(1.1rem,3.5vw,1.65rem)] font-semibold leading-snug text-[var(--brand-ink-soft)]">{props.subtitle}</p>}
        {props.description && <p className="mx-auto mt-3 max-w-[600px] px-2 text-[clamp(0.92rem,2.6vw,1.1rem)] font-medium leading-relaxed text-[var(--brand-ink-soft)] opacity-90">{props.description}</p>}
        {props.badge && !props.imageUrl && (
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--brand)_8%,transparent)] px-4 py-2 text-[clamp(0.8rem,2.5vw,0.9rem)] font-bold text-[var(--brand-strong)]">
            <Calendar size={15} className="text-[var(--brand)]" aria-hidden /> {props.badge}
          </p>
        )}
        {props.ctaLabel && href && (
          <div className="mt-8">
            <a href={href} className={pillButton}>
              <Ticket size={19} aria-hidden /> {props.ctaLabel} <ArrowRight size={19} strokeWidth={2.5} aria-hidden />
            </a>
            {!props.ctaHref && from !== null && <p className="mt-2.5 text-[0.82rem] font-semibold text-[var(--brand-strong)] opacity-85">A partire da {euro(from)} · Pagamento sicuro con Nexi</p>}
          </div>
        )}
        {props.imageUrl && (
          <div className="relative mx-auto mt-12 aspect-video w-full max-w-6xl overflow-hidden rounded-[2rem] bg-black shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <Image src={props.imageUrl} alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
