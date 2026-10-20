import type { MetadataRoute } from 'next';

// Fuori dai motori di ricerca: area riservata, app da campo, API e pagine personali (biglietti, ricevute,
// link di pagamento, checkout). Le pagine personali hanno comunque un token non indovinabile e noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/cassa', '/cashier', '/scanner', '/abbina', '/login', '/acquista', '/i-miei-biglietti', '/paga', '/ricevuta'],
    },
    sitemap: 'https://prolocogasperina.it/sitemap.xml',
  };
}
