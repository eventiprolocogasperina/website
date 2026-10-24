import type { MetadataRoute } from 'next';
import { getAllEvents } from '@/lib/data/events';
import { getAllNews } from '@/lib/data/news';
import { SITE_URL } from '@/lib/seo/jsonld';
import { listPublicEditionsWithHref, listPublicFormats } from '@/server/public/editions';
import { publicV2Enabled } from '@/server/public/flags';
import { log } from '@/server/log';

// Generata a ogni richiesta: così non dipende dal database durante la build e resta aggiornata.
export const dynamic = 'force-dynamic';

const STATIC = ['', '/eventi', '/zuccaland', '/assaggia-e-passeggia', '/notizie', '/sponsor', '/media', '/associazione', '/scopri-gasperina', '/contatti', '/iscriviti', '/privacy', '/trasparenza'];

type Entry = MetadataRoute.Sitemap[number];

/**
 * Pagine statiche, format, edizioni e notizie (§13.5). Con il flag public_v2 le edizioni arrivano dall'admin
 * con il loro indirizzo pubblico (/zuccaland/2027, /eventi/<slug>…); senza, gli eventi di oggi.
 * Una sorgente che non risponde non fa fallire la sitemap: si salta e resta nel log.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const entries = new Map<string, Entry>();
  const add = (path: string, e: Omit<Entry, 'url'>) => {
    if (!entries.has(path)) entries.set(path, { url: `${SITE_URL}${path}`, ...e });
  };
  for (const route of STATIC) add(route, { lastModified: now, changeFrequency: 'weekly', priority: route === '' ? 1 : 0.8 });

  try {
    if (await publicV2Enabled()) {
      for (const f of await listPublicFormats()) add(f.href, { lastModified: now, changeFrequency: 'weekly', priority: 0.9 });
      const { list, hrefs } = await listPublicEditionsWithHref();
      for (const e of list) {
        const archived = e.status === 'concluded' || e.status === 'archived';
        add(hrefs.get(e.id)!, { lastModified: (e.startsAt ?? new Date()).toISOString(), changeFrequency: archived ? 'yearly' : 'weekly', priority: archived ? 0.5 : 0.7 });
      }
    } else {
      for (const event of await getAllEvents()) {
        add(`/eventi/${event.slug}`, { lastModified: new Date(event.date).toISOString(), changeFrequency: 'monthly', priority: 0.6 });
      }
    }
  } catch (error) {
    log.error('Sitemap: eventi non disponibili', { error });
  }

  try {
    for (const article of await getAllNews()) {
      add(`/notizie/${article.slug}`, { lastModified: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined, changeFrequency: 'monthly', priority: 0.5 });
    }
  } catch (error) {
    log.error('Sitemap: notizie non disponibili', { error });
  }

  return [...entries.values()];
}
