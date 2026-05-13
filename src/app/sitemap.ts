import { MetadataRoute } from 'next';
import { getAllEvents } from '@/lib/data/events';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://prolocogasperina.it';
  
  // Static routes
  const routes = [
    '',
    '/eventi',
    '/soci',
    '/media',
    '/associazione',
    '/scopri-gasperina',
    '/contatti',
    '/iscriviti',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic event routes
  const events = await getAllEvents();
  const eventRoutes = events.map((event) => ({
    url: `${baseUrl}/eventi/${event.slug}`,
    lastModified: new Date(event.date).toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...routes, ...eventRoutes];
}
