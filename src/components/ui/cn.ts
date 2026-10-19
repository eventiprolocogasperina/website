/** Unisce classi CSS ignorando i valori falsy. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Anello di focus visibile da tastiera (§14.7), uguale per tutti i controlli. */
export const focusRing =
  'outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/** Transizione breve dell'admin: al massimo 150 ms (§14.7). */
export const transition = 'transition-colors duration-150 ease-out';
