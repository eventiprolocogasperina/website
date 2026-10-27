/**
 * Converte una cartella di foto in un album webp del sito, come quello di Assaggia & Passeggia 2026.
 *
 *   npm run foto -- --album zuccaland-2026 --da "/Volumes/SSD/Zuccaland 2026/Export"
 *
 * - legge jpg, jpeg, png, tiff, heic e webp anche nelle sottocartelle;
 * - raddrizza le foto, le riduce a 1920 px sul lato lungo e toglie i metadati (posizione GPS compresa);
 * - le salva in public/img/<album>/ e scrive l'elenco in src/lib/data/albums/<album>.json;
 * - rigenera src/lib/data/albums/index.ts, così l'album compare nel blocco Galleria dell'editor.
 *
 * Si può rilanciare: le foto già convertite si saltano (--rifai per riconvertirle tutte).
 * Poi: commit di public/img/<album> e src/lib/data/albums, e nel blocco Galleria si sceglie l'album.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'src', 'lib', 'data', 'albums');
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic', '.heif', '.webp']);
const MAX_SIDE = 1920;
const QUALITY = 80;

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

const byName = (a: Photo, b: Photo) => a.src.localeCompare(b.src, 'it', { numeric: true });

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
    '/** Album di foto webp in public/img/<nome>, scelti nel blocco Galleria. */',
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

  const target = path.join(ROOT, 'public', 'img', album);
  const manifest = path.join(DATA_DIR, `${album}.json`);
  await fs.mkdir(target, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  const sources = (await walk(from)).filter((f) => EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (!sources.length) throw new Error(`Nessuna foto in ${from}`);
  const known = new Map<string, Photo>();
  try {
    for (const p of JSON.parse(await fs.readFile(manifest, 'utf8')) as Photo[]) known.set(p.src, p);
  } catch {
    // Album nuovo.
  }

  console.log(`${sources.length} foto da convertire in public/img/${album}/`);
  const photos = new Map<string, Photo>(known);
  let done = 0;
  let skipped = 0;
  let failed = 0;
  const used = new Set<string>();
  for (const file of sources) {
    // Stesso nome in due sottocartelle: la seconda prende un numero, nessuna si sovrascrive.
    let name = fileName(file);
    for (let n = 2; used.has(name); n++) name = fileName(file).replace(/\.webp$/, `_${n}.webp`);
    used.add(name);
    const src = `/img/${album}/${name}`;
    const out = path.join(target, name);
    try {
      const exists = await fs.stat(out).then(() => true, () => false);
      if (exists && !redo && known.has(src)) {
        skipped++;
        continue;
      }
      const info = await sharp(file)
        .rotate()
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(out);
      photos.set(src, { src, width: info.width, height: info.height });
      done++;
      if (done % 20 === 0) console.log(`  ${done} convertite…`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${path.basename(file)}: ${(e as Error).message}`);
    }
  }

  const list = [...photos.values()].sort(byName);
  await fs.writeFile(manifest, JSON.stringify(list, null, 2) + '\n');
  await writeIndex();
  const size = (await Promise.all(list.map((p) => fs.stat(path.join(ROOT, 'public', p.src)).then((s) => s.size, () => 0)))).reduce((a, b) => a + b, 0);
  console.log(`Fatto: ${done} convertite, ${skipped} già presenti, ${failed} non riuscite. Album "${album}": ${list.length} foto, ${(size / 1024 / 1024).toFixed(1)} MB.`);
  console.log(`Ora: git add public/img/${album} src/lib/data/albums e scegli l'album nel blocco Galleria.`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
