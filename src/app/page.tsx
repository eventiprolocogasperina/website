import Hero from '@/components/home/Hero';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import CommunityImpact from '@/components/home/CommunityImpact';
import DiscoverTeaser from '@/components/home/DiscoverTeaser';
import AssaggiaTeaser from '@/components/home/AssaggiaTeaser';
import ZuccalandTeaser from '@/components/home/ZuccalandTeaser';
import { getUpcomingEvents } from '@/lib/data/events';
import { legacyCard } from '@/components/events/EventCard';
import { upcomingCards } from '@/lib/public/calendar';
import { romeDay } from '@/lib/public/editions';
import { listPublicEditionsWithHref } from '@/server/public/editions';
import { publicV2Enabled } from '@/server/public/flags';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Loco Gasperina APS — Cultura, Tradizioni e Turismo a Gasperina',
  description: 'La Pro Loco Gasperina APS promuove la cultura, le tradizioni e il turismo nel borgo calabrese di Gasperina. Scopri gli eventi, i progetti e la bellezza del territorio.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Con il flag public_v2 i prossimi eventi sono le edizioni (le card delle pagine dedicate portano lì).
  const events = (await publicV2Enabled())
    ? await listPublicEditionsWithHref().then(({ list, hrefs }) => upcomingCards(list, hrefs, romeDay(new Date())!))
    : (await getUpcomingEvents()).map((e) => ({ ...legacyCard(e), price: e.price }));

  return (
    <>
      <Hero />
      <ZuccalandTeaser />
      <AssaggiaTeaser />
      <UpcomingEvents events={events} />
      <DiscoverTeaser />
      <CommunityImpact />
    </>
  );
}
