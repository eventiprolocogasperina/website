import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { log } from '@/server/log';

/*
 * Immagini (loghi) da incorporare nel PDF dei biglietti come data URI, lato server.
 * - percorsi del sito (/img/…): letti da public/;
 * - indirizzi https (es. logo caricato su Cloudinary da Admin › Format): scaricati con un limite di
 *   tempo e di peso. Se qualcosa va storto il PDF esce lo stesso, senza quel logo.
 * react-pdf legge solo PNG e JPEG: a Cloudinary si chiede il PNG.
 */

const TIMEOUT_MS = 3000;
const MAX_BYTES = 2 * 1024 * 1024;
const cache = new Map<string, string>();

const LOCAL = /^\/img\/[\w\-/.&]+\.(png|jpe?g)$/i;

/** Per Cloudinary: chiede il PNG (react-pdf non legge webp/avif). Gli altri indirizzi restano uguali. */
export function pdfFriendlyUrl(src: string): string {
  const url = new URL(src);
  if (url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/') && !url.pathname.includes('/f_png')) {
    url.pathname = url.pathname.replace('/image/upload/', '/image/upload/f_png/');
  }
  return url.toString();
}

/** Tipo dell'immagine dai primi byte (PNG o JPEG), altrimenti null. */
export function sniffImage(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  if (bytes.length > 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}

async function load(src: string): Promise<string> {
  if (LOCAL.test(src) && !src.includes('..')) {
    const bytes = await readFile(path.join(process.cwd(), 'public', src));
    const mime = sniffImage(bytes);
    return mime ? `data:${mime};base64,${bytes.toString('base64')}` : '';
  }
  if (!/^https:\/\//.test(src)) return '';
  const res = await fetch(pdfFriendlyUrl(src), { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('immagine troppo grande');
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error('immagine troppo grande');
  const mime = sniffImage(bytes);
  if (!mime) throw new Error('non è un PNG o un JPEG');
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

/** Data URI dell'immagine, oppure undefined se manca, non si scarica in tempo o non è PNG/JPEG. */
export async function pdfImage(src: string | null | undefined): Promise<string | undefined> {
  if (!src) return undefined;
  if (!cache.has(src)) {
    try {
      const data = await load(src);
      if (cache.size > 100) cache.clear();
      cache.set(src, data);
    } catch (error) {
      // Solo l'host nel log: l'indirizzo completo può contenere parametri firmati.
      log.warn('Logo del PDF non disponibile', { error, host: /^https:/.test(src) ? new URL(src).host : 'locale' });
      // Un errore di rete non resta in memoria: al prossimo PDF si riprova.
      return undefined;
    }
  }
  return cache.get(src) || undefined;
}
