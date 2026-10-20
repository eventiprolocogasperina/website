/*
 * Classi comuni dei blocchi. I colori vengono dai token del format (--brand…, brandThemeStyle in
 * src/lib/edition-theme.ts); le griglie usano le container query (@container sulla pagina), così
 * l'anteprima affiancata dell'editor si comporta come un telefono o un computer secondo la sua larghezza.
 */
export const section = 'relative px-4 py-10 @3xl:py-14';
export const wrap = 'mx-auto w-full max-w-6xl';
export const narrow = 'mx-auto w-full max-w-3xl';
export const display = 'font-[family-name:var(--font-display)]';
export const h2 = `${display} text-center text-[clamp(1.8rem,5vw,2.5rem)] font-bold leading-tight text-[var(--brand)] mb-6`;
export const card = 'rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] @3xl:p-8';
export const muted = 'text-[var(--brand-ink-soft)]';
export const pillButton =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--brand)_0%,var(--brand-strong)_100%)] px-7 py-3 text-[1.02rem] font-extrabold text-[var(--brand-fg)] no-underline shadow-[0_8px_25px_color-mix(in_srgb,var(--brand)_35%,transparent)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]';

/** "€ 5" oppure "€ 5,50". */
export function euro(cents: number): string {
  const v = cents / 100;
  return `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
