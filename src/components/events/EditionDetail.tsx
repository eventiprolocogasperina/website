import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, Ticket } from 'lucide-react';
import FormattedText from '@/components/ui/FormattedText';
import ShareButtons from '@/components/ui/ShareButtons';
import { FALLBACK_IMAGE } from '@/lib/public/calendar';
import type { PublicEdition } from '@/lib/public/editions';
import type { CheckoutView } from '@/server/domain/checkout';

// Scheda generica di un'edizione (/eventi/[slug], public_page_mode = 'generic'): dati dell'edizione,
// prezzi e date dal catalogo (mai scritti a mano) e il pulsante verso il checkout unico /acquista.

const euro = (cents: number) => (cents === 0 ? 'Gratis' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100));
const day = (d: Date | string) =>
  new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const time = (d: Date | string) => new Date(d).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });

type Props = {
  edition: PublicEdition;
  /** Catalogo online; null se l'edizione non ha (ancora) un catalogo pubblico. */
  checkout: CheckoutView | null;
  /** Testo lungo dell'evento di oggi collegato, se c'è. */
  body: string | null;
  isPast: boolean;
};

export function EditionDetail({ edition: e, checkout, body, isPast }: Props) {
  const pills = [
    e.startsAt ? { icon: Calendar, text: day(e.startsAt) } : { icon: Calendar, text: 'Data da definire' },
    ...(e.startsAt ? [{ icon: Clock, text: `Ore ${time(e.startsAt)}` }] : []),
    { icon: MapPin, text: e.location ?? 'Gasperina' },
  ];
  const products = checkout?.products ?? [];
  const sessions = (checkout?.sessions ?? []).filter((s) => s.status !== 'cancelled');

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      <div style={{ position: 'relative', overflow: 'hidden', height: 'clamp(320px, 50vh, 460px)' }}>
        <Image src={e.coverImage || FALLBACK_IMAGE} alt="" fill priority sizes="100vw" style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.2) 0%, rgba(10,12,18,0.92) 100%)' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: '2rem', transform: 'translateX(-50%)', width: '100%', maxWidth: '900px', padding: '0 1.5rem' }}>
          <Link href="/eventi" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            <ArrowLeft size={14} aria-hidden /> Torna agli eventi
          </Link>
          <br />
          {e.category && (
            <span className={`badge ${e.category === 'musica' ? 'badge-gold' : e.category === 'gastronomia' ? 'badge-green' : 'badge-blue'}`} style={{ marginBottom: '0.6rem', display: 'inline-flex' }}>
              {e.category}
            </span>
          )}
          <h1 style={{ fontWeight: 300, color: '#ffffff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.1 }}>{e.title}</h1>
          {e.subtitle && <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem', fontSize: '1.05rem' }}>{e.subtitle}</p>}
        </div>
      </div>

      <div className="section-inner" style={{ maxWidth: '900px', padding: '2rem 1.5rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', listStyle: 'none', padding: 0, margin: 0 }}>
          {pills.map(({ icon: Icon, text }) => (
            <li key={text} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', textTransform: 'capitalize', border: '1px solid var(--neutral-800)', color: 'var(--neutral-300)' }}>
              <Icon size={14} aria-hidden style={{ color: 'var(--gold-500)' }} /> {text}
            </li>
          ))}
        </ul>

        {body && (
          <div style={{ color: 'var(--neutral-300)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {body.split('\n').filter(Boolean).map((p, i) => (
              <FormattedText key={i} as="p" text={p} />
            ))}
          </div>
        )}

        <section aria-labelledby="biglietti" className="card" style={{ padding: '1.5rem' }}>
          <h2 id="biglietti" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Ticket size={20} aria-hidden style={{ color: 'var(--gold-500)' }} /> Biglietti
          </h2>
          {products.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {products.map((p) => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.6rem' }}>
                  <span>
                    <strong style={{ color: 'var(--color-heading)' }}>{p.name}</strong>
                    {p.description && <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--neutral-400)' }}>{p.description}</span>}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--gold-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>{euro(p.priceCents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--neutral-400)' }}>{isPast ? 'L’evento si è concluso.' : 'I biglietti non sono ancora disponibili online.'}</p>
          )}
          {sessions.length > 1 && (
            <p style={{ marginTop: '1rem', fontSize: '0.88rem', color: 'var(--neutral-400)' }}>
              Date: {sessions.map((s) => s.label).join(' · ')}
            </p>
          )}
          {!isPast && checkout && (
            <div style={{ marginTop: '1.25rem' }}>
              {checkout.selling ? (
                <Link href={`/acquista/${e.slug}`} className="btn btn-gold">
                  Acquista i biglietti
                </Link>
              ) : (
                products.length > 0 && <p role="status" style={{ color: 'var(--neutral-400)' }}>{checkout.closedReason}</p>
              )}
            </div>
          )}
        </section>

        <ShareButtons title={e.title} text={e.subtitle ?? undefined} />
      </div>
    </div>
  );
}
