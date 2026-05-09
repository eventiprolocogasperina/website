import Hero from '@/components/home/Hero';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import CommunityImpact from '@/components/home/CommunityImpact';
import DiscoverTeaser from '@/components/home/DiscoverTeaser';
import { getUpcomingEvents } from '@/lib/data/events';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Loco Gasperina APS — Cultura, Tradizioni e Turismo a Gasperina',
  description: 'La Pro Loco Gasperina APS promuove la cultura, le tradizioni e il turismo nel borgo calabrese di Gasperina. Scopri gli eventi, i progetti e la bellezza del territorio.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const events = await getUpcomingEvents();

  return (
    <>
      <Hero />
      <UpcomingEvents events={events} />
      <DiscoverTeaser />
      <FeaturedProjects />
      <CommunityImpact />
    </>
  );
}
