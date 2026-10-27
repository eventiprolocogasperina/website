/**
 * Converte una cartella di foto in un album webp del sito e le carica su Cloudinary.
 *
 *   npm run foto -- --album zuccaland-2026 --da "/Volumes/SSD/Zuccaland 2026/Export"
 *
 * - legge jpg, jpeg, png, tiff, heic e webp anche nelle sottocartelle;
 * - raddrizza le foto, le riduce a 1920 px sul lato lungo e toglie i metadati (posizione GPS compresa);
 * - le carica su Cloudinary in albums/<album>/ (CLOUDINARY_* da .env.local) e scrive l'elenco dei link
 *   in src/lib/data/albums/<album>.json: nel sito restano solo i link, non le foto;
 * - rigenera src/lib/data/albums/index.ts, così l'album compare nel blocco Galleria dell'editor.
 *
 * Si può rilanciare con un'altra cartella: le foto aggiunge, quelle già caricate (stesso nome) si saltano
 * (--rifai per riconvertirle e ricaricarle tutte). Poi: commit di src/lib/data/albums e nel blocco
 * "Grazie e ricordi" o Galleria si sceglie l'album.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'src', 'lib', 'data', 'albums');
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic', '.heif', '.webp']);
const MAX_SIDE = 1920;
const QUALITY = 80;
/** Caricamenti in parallelo verso Cloudinary. */
const PARALLEL = 4;

type Photo = { src: string; width: number; height: number };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((e) => !e.name.startsWith('.') && e.name !== '__MACOSX')
      .map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return nested.flat();
}

/** Nome del file sul sito: niente spazi né caratteri strani, così l'indirizzo resta pulito. */
const fileName = (file: string) =>
  path
    .basename(file, path.extname(file))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') + '.webp';

/** Nome della foto senza cartella né estensione: vale sia per i link di Cloudinary sia per /img/... */
const stem = (src: string) => path.basename(src).replace(/\.[a-z]+$/i, '');
const byName = (a: Photo, b: Photo) => stem(a.src).localeCompare(stem(b.src), 'it', { numeric: true });

function configureCloudinary() {
  try {
    process.loadEnvFile(path.join(ROOT, '.env.local'));
  } catch {
    // Variabili già nell'ambiente.
  }
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
  if (!cloud_name || !api_key || !api_secret) throw new Error('Mancano CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET in .env.local.');
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

function upload(data: Buffer, publicId: string, overwrite: boolean) {
  return new Promise<{ secure_url: string; width: number; height: number }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ public_id: publicId, overwrite, invalidate: overwrite, resource_type: 'image' }, (err, res) => (err || !res ? reject(err ?? new Error('caricamento non riuscito')) : resolve(res)))
      .end(data);
  });
}

/** Riscrive l'elenco degli album che il sito conosce (nomi per l'editor, foto per la pagina). */
async function writeIndex() {
  const files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith('.json')).sort();
  const albums = await Promise.all(
    files.map(async (f) => ({ name: f.slice(0, -5), count: (JSON.parse(await fs.readFile(path.join(DATA_DIR, f), 'utf8')) as Photo[]).length })),
  );
  const body = [
    '// Generato da scripts/foto.ts (npm run foto): non modificare a mano.',
    '',
    'export type AlbumPhoto = { src: string; width: number; height: number };',
    '',
    '/** Album di foto webp (su Cloudinary), scelti nei blocchi "Grazie e ricordi" e Galleria. */',
    `export const ALBUMS: Array<{ name: string; count: number }> = ${JSON.stringify(albums)};`,
    '',
    'const LOADERS: Record<string, () => Promise<{ default: AlbumPhoto[] }>> = {',
    ...albums.map((a) => `  ${JSON.stringify(a.name)}: () => import('./${a.name}.json'),`),
    '};',
    '',
    'export async function loadAlbum(name: string): Promise<AlbumPhoto[]> {',
    '  const load = LOADERS[name];',
    '  return load ? (await load()).default : [];',
    '}',
    '',
  ].join('\n');
  await fs.writeFile(path.join(DATA_DIR, 'index.ts'), body);
}

async function main() {
  const album = arg('album');
  const from = arg('da');
  const redo = process.argv.includes('--rifai');
  if (!album || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(album)) throw new Error('Serve --album, es. --album zuccaland-2026 (minuscole, numeri e trattini).');
  if (!from) throw new Error('Serve --da con la cartella delle foto originali.');

  configureCloudinary();
  const manifest = path.join(DATA_DIR, `${album}.json`);
  await fs.mkdir(DATA_DIR, { recursive: true });

  const sources = (await walk(from)).filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (!sources.length) throw new Error(`Nessuna foto in ${from}`);
  const photos = new Map<string, Photo>();
  try {
    for (const p of JSON.parse(await fs.readFile(manifest, 'utf8')) as Photo[]) photos.set(stem(p.src), p);
  } catch {
    // Album nuovo.
  }

  // Stesso nome in due sottocartelle: la seconda prende un numero, nessuna si sovrascrive.
  const used = new Set<string>();
  const jobs = sources.map((file) => {
    const base = stem(fileName(file));
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
    used.add(name);
    return { file, name };
  });
  const todo = jobs.filter((j) => redo || !photos.get(j.name)?.src.startsWith('https://'));
  console.log(`${sources.length} foto, ${todo.length} da convertire e caricare su Cloudinary in albums/${album}/`);

  let done = 0;
  let failed = 0;
  let bytes = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          const webp = await sharp(job.file)
            .rotate()
            .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer();
          const res = await upload(webp, `albums/${album}/${job.name}`, redo);
          photos.set(job.name, { src: res.secure_url, width: res.width, height: res.height });
          bytes += webp.length;
          if (++done % 20 === 0) console.log(`  ${done} caricate…`);
        } catch (e) {
          failed++;
          console.error(`  ✗ ${path.basename(job.file)}: ${(e as Error).message}`);
        }
      }
    }),
  );

  const list = [...photos.values()].sort(byName);
  await fs.writeFile(manifest, JSON.stringify(list, null, 2) + '\n');
  await writeIndex();
  console.log(`Fatto: ${done} caricate (${(bytes / 1024 / 1024).toFixed(1)} MB), ${sources.length - todo.length} già presenti, ${failed} non riuscite. Album "${album}": ${list.length} foto.`);
  console.log(`Ora: git add src/lib/data/albums e scegli l'album nel blocco "Grazie e ricordi".`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
