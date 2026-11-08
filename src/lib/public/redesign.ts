/**
 * Pagine pubbliche con il design v3 (proposta 2026-11). Le pagine dei format (Zuccaland, Assaggia e
 * Passeggia), le schede dei singoli eventi (/eventi/[slug], con la prenotazione), checkout, biglietti e
 * admin restano con il layout di prima.
 */
const EXACT = ['/', '/scopri-gasperina', '/eventi', '/notizie', '/media', '/associazione', '/iscriviti', '/sponsor', '/contatti', '/trasparenza', '/privacy'];
const PREFIX = ['/notizie/'];

export function isRedesignedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return EXACT.includes(path) || PREFIX.some((p) => path.startsWith(p));
}
