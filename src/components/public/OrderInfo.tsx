import { CalendarDays, Clock, MapPin, Navigation } from 'lucide-react';
import { formatDate, romeTime } from '@/lib/dates';
import type { MyOrder } from '@/server/domain/checkout/my-tickets';
import { card } from './checkout/parts';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Giorno e orario d'apertura dell'ordine, in evidenza (banner del successo di produzione): la data scelta,
 * oppure l'inizio dell'edizione. Il luogo con "Come arrivare" viene dal blocco Mappa dell'edizione.
 */
export function VisitBanner({ order }: { order: MyOrder }) {
  const start = order.session?.startsAt ?? order.edition.startsAt;
  return (
    <section aria-label="Quando e dove" className={`${card} overflow-hidden`}>
      {start && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-gradient-to-br from-[var(--ev-soft)] to-[var(--ev-softer)] px-5 py-4 text-[var(--ev-ink)]">
          <p className="flex items-center gap-2 text-pub-lg font-extrabold">
            <CalendarDays size={20} aria-hidden className="shrink-0 text-primary" />
            <span>{capitalize(formatDate(start))}</span>
          </p>
          <p className="flex items-center gap-2 text-pub-base font-semibold">
            <Clock size={18} aria-hidden className="shrink-0 text-primary" /> Apertura dalle ore {romeTime(start)}
          </p>
        </div>
      )}
      {(order.edition.location || order.edition.map) && (
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-pub-base text-fg">
            <MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong className="block text-[var(--ev-ink)]">Come arrivare</strong>
              {order.edition.map?.address ?? order.edition.location}
            </span>
          </p>
          {order.edition.map && (
            <a
              href={order.edition.map.url}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-[var(--ev-border)] bg-white px-5 text-pub-sm font-bold text-[var(--ev-ink)] hover:bg-[var(--ev-softer)]"
            >
              <Navigation size={16} aria-hidden /> Apri su Google Maps
            </a>
          )}
        </div>
      )}
    </section>
  );
}

/** Pulsanti pillola delle pagine dopo l'acquisto. */
export const pillPrimary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-pub-base font-bold text-primary-fg shadow-[0_10px_22px_-10px_var(--ev-glow)] hover:bg-primary-hover';
export const pillSecondary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[var(--ev-border)] bg-white px-6 text-pub-base font-bold text-[var(--ev-ink)] hover:bg-[var(--ev-softer)]';
