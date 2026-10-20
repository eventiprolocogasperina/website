// Controllo dei link interni: visita le rotte statiche, la sitemap, gli URL storici (QR stampati)
// e ogni link interno trovato nelle pagine, e riporta quelli che rispondono 404.
// Uso: avvia il sito (npm run dev, o npm run build && npm start), poi
//   node --experimental-strip-types scripts/check-links.ts [http://localhost:3000]
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const MAX_PAGES = 800;

// URL che esistono fuori dal sito (QR stampati, email già inviate, vecchi link): devono funzionare.
// Le tappe esistenti dipendono dal contenuto A&P nel database: con i dati di prova c'è solo la 1.
// Contro il sito vero aggiungi gli id delle altre tappe come argomenti: ... check-links.ts URL 2 3 4
const TAPPE = ['1', ...process.argv.slice(3)];
const HISTORICAL = [
  // QR stampati delle tappe A&P 2026 (URL stabile, decisione 5A) e le loro versioni con "edizione-2026".
  ...TAPPE.map((id) => `/assaggia-e-passeggia/tappa/${id}`),
  ...TAPPE.map((id) => `/assaggia-e-passeggia/edizione-2026/tappa/${id}`),
  // Vecchie pagine A&P 2026, acquisto e successo (link nelle email e sui social).
  '/assaggia-e-passeggia/edizione-2026', '/assaggia-e-passeggia/edizione-2026/ticket', '/assaggia-e-passeggia/edizione-2026/success',
  '/assaggia-e-passeggia/ticket', '/assaggia-e-passeggia/success',
  // Zuccaland: pagina, successo, foto, galleria e rimborsi (QR sui tavoli, email dei biglietti).
  '/zuccaland', '/zuccaland/success', '/zuccaland/photo', '/zuccaland/galleria', '/zuccaland/rimborso',
  // Schede eventi con gli slug di oggi (sitemap prima del prompt 17) e la pagina della Baguette.
  '/eventi/zuccaland-2026', '/eventi/assaggia-e-passeggia-2026', '/eventi/concerto-di-natale-2026', '/eventi/la-baguette-da-record-2026',
  // Pagine istituzionali.
  '/privacy', '/trasparenza', '/iscriviti',
];

// Percorsi da non visitare: area riservata, API e file tecnici.
const SKIP = [/^\/admin/, /^\/api\//, /^\/_next\//, /^\/cashier/, /^\/login/, /^\/ricevuta\//, /^\/paga\//];

function staticRoutes(dir = 'src/app'): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...staticRoutes(full));
    else if (name === 'page.tsx') {
      const route = '/' + relative('src/app', dir).split(sep).filter((s) => !s.startsWith('(')).join('/');
      if (!route.includes('[')) out.push(route === '/.' ? '/' : route.replace(/\/$/, '') || '/');
    }
  }
  return out;
}

async function sitemapPaths(): Promise<string[]> {
  try {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  } catch {
    return [];
  }
}

function internalLinks(html: string): string[] {
  const links: string[] = [];
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, '&');
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    links.push(href.split('#')[0].split('?')[0] || '/');
  }
  return links;
}

const shouldSkip = (path: string) => SKIP.some((re) => re.test(path)) || /\.(png|jpe?g|svg|webp|pdf|ico|xml|txt|json|webmanifest)$/i.test(path);

async function main() {
  const queue = new Map<string, string>(); // percorso -> dove è stato trovato
  for (const p of staticRoutes()) queue.set(p, 'rotta statica');
  for (const p of await sitemapPaths()) if (!queue.has(p)) queue.set(p, 'sitemap');
  for (const p of HISTORICAL) queue.set(p, 'URL storico');

  const visited = new Set<string>();
  const broken: Array<{ path: string; status: number; from: string }> = [];

  while (queue.size > 0 && visited.size < MAX_PAGES) {
    const [path, from] = queue.entries().next().value as [string, string];
    queue.delete(path);
    if (visited.has(path) || shouldSkip(path)) continue;
    visited.add(path);

    let res: Response;
    try {
      res = await fetch(BASE + path, { redirect: 'follow' });
    } catch (err) {
      broken.push({ path, status: 0, from });
      continue;
    }
    if (res.status === 404) broken.push({ path, status: 404, from });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) continue;

    const finalPath = new URL(res.url).pathname;
    for (const link of internalLinks(await res.text())) {
      if (!visited.has(link) && !queue.has(link)) queue.set(link, finalPath);
    }
  }

  console.log(`Pagine visitate: ${visited.size}`);
  if (broken.length === 0) {
    console.log('Nessun link interno rotto.');
    return;
  }
  console.log(`Link rotti: ${broken.length}`);
  for (const b of broken) console.log(`  ${b.status}  ${b.path}   (trovato in: ${b.from})`);
  process.exitCode = 1;
}

main();
