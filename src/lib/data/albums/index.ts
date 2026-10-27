// Generato da scripts/foto.ts (npm run foto): non modificare a mano.

export type AlbumPhoto = { src: string; width: number; height: number };

/** Album di foto webp in public/img/<nome>, scelti nel blocco Galleria. */
export const ALBUMS: Array<{ name: string; count: number }> = [{"name":"assaggia-2026","count":324}];

const LOADERS: Record<string, () => Promise<{ default: AlbumPhoto[] }>> = {
  "assaggia-2026": () => import('./assaggia-2026.json'),
};

export async function loadAlbum(name: string): Promise<AlbumPhoto[]> {
  const load = LOADERS[name];
  return load ? (await load()).default : [];
}
