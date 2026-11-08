import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarFilterBar } from '@/components/events/CalendarFilterBar';
import { parseCalendarFilters } from '@/lib/public/calendar';
import { loadEventCards } from '@/server/public/event-cards';
import { EventCardV3, PageHero, V3Page } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Eventi',
  description: 'Scopri tutti gli eventi organizzati dalla Pro Loco Gasperina APS: sagre, concerti, esperienze enogastronomiche e molto altro.',
  alternates: { canonical: '/eventi' },
  openGraph: { title: 'Eventi della Pro Loco Gasperina', url: '/eventi', images: [{ url: '/img/Event_1.jpeg' }] },
};

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Calendario (§13.2). Con il flag public_v2: le edizioni dall'admin, con filtri per categoria e mese, e le
 * card delle pagine dedicate che portano a /zuccaland, /assaggia-e-passeggia… Senza: gli eventi di oggi.
 */
export default async function EventiPage({ searchParams }: Props) {
  const { upcoming, past, calendar } = await loadEventCards(parseCalendarFilters(await searchParams));
  const filters = calendar ? parseCalendarFilters(await searchParams) : null;
  const filtered = !!filters && (filters.category || filters.month);

  return (
    <V3Page>
      <PageHero
        eyebrow="Calendario"
        title="I nostri"
        accent="eventi."
        lede="Tutti gli appuntamenti organizzati dalla Pro Loco Gasperina: feste, itinerari enogastronomici, iniziative culturali e gite."
      />

      {!upcoming.length && !past.length && (
        <section className="panel p-cream" role="status">
          <h2 className="h2">Nessun evento{filtered ? ' con questi filtri' : ''}.</h2>
          {filtered && (
            <div className="actions" style={{ marginTop: 22 }}>
              <Link className="vbtn vbtn-blue" href="/eventi">Mostra tutti gli eventi</Link>
            </div>
          )}
        </section>
      )}

      {calendar && (calendar.months.length > 1 || calendar.categories.length > 1) && (
        <section className="panel p-white" style={{ paddingBlock: 36, paddingBottom: 0 }}>
          <CalendarFilterBar filters={filters!} months={calendar.months} categories={calendar.categories} />
        </section>
      )}

      {upcoming.length > 0 ? (
        <section className="panel p-gold">
          <div className="panel-head">
            <div>
              <span className="eyebrow">In programma</span>
              <h2 className="h2">Prossimi eventi.</h2>
            </div>
          </div>
          <div className="grid g3">
            {upcoming.map((e) => (
              <EventCardV3 key={e.id} event={e} past={false} />
            ))}
          </div>
        </section>
      ) : (
        past.length > 0 && (
          <section className="panel p-blued">
            <span className="eyebrow">Prossimi eventi</span>
            <h2 className="h2">Nessun evento in programma.</h2>
            <p className="lede" style={{ marginTop: 18 }}>Al momento non ci sono date in calendario. Apri la pagina di un nostro evento e lascia la tua email con «Avvisami»: ti scriviamo appena aprono le vendite della prossima edizione.</p>
            <div className="actions" style={{ marginTop: 22 }}>
              <Link className="vbtn vbtn-gold" href="/zuccaland">Zuccaland</Link>
              <Link className="vbtn vbtn-line" href="/assaggia-e-passeggia">Assaggia &amp; Passeggia</Link>
            </div>
          </section>
        )
      )}

      {past.length > 0 && (
        <section className="panel p-cream">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Archivio</span>
              <h2 className="h2">Edizioni passate.</h2>
            </div>
          </div>
          <div className="grid g3">
            {past.map((e) => (
              <EventCardV3 key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </V3Page>
  );
}
