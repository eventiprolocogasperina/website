import { MetadataRoute } from 'next';
import { getAllEvents } from '@/lib/data/events';
import { getAllNews } from '@/lib/data/news';

// Generata a ogni richiesta: così non dipende dal database durante la build e resta aggiornata.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://prolocogasperina.it';
  
  // Static routes
  const routes = [
    '',
    '/eventi',
    '/zuccaland',
    '/assaggia-e-passeggia',
    '/notizie',
    '/sponsor',
    '/media',
    '/associazione',
    '/scopri-gasperina',
    '/contatti',
    '/iscriviti',
    '/privacy',
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

  const news = await getAllNews();
  const newsRoutes = news.map((article) => ({
    url: `${baseUrl}/notizie/${article.slug}`,
    lastModified: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...routes, ...eventRoutes, ...newsRoutes];
}
