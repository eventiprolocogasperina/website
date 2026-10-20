// Menu del sito pubblico (§13.1), modificabile da /admin/sito/navigazione e salvato in site_settings.public_nav.
import { z } from 'zod';

const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\/[^\s]+$/.test(v), 'Usa un indirizzo del sito (/eventi) o un link https://.');
const label = z.string().trim().min(1, 'Scrivi il testo della voce.').max(40, 'Al massimo 40 caratteri.');

export const NavChild = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('link'), label, href }),
  /** Segnaposto: diventa una voce per ogni format con pagina pubblica (Zuccaland, Assaggia e Passeggia…). */
  z.object({ kind: z.literal('formats') }),
]);
export const NavEntry = z.object({ label, href, children: z.array(NavChild).max(12).default([]) });
export const NavConfig = z.object({
  items: z.array(NavEntry).min(1, 'Il menu deve avere almeno una voce.').max(10, 'Al massimo 10 voci: su telefono non ci starebbero.'),
  cta: z.object({ label, href }).nullable(),
  /** Format da non mostrare nella tendina anche se hanno una pagina pubblica (slug). */
  hiddenFormats: z.array(z.string().max(80)).max(50).default([]),
});
export type NavChild = z.infer<typeof NavChild>;
export type NavEntry = z.infer<typeof NavEntry>;
export type NavConfig = z.infer<typeof NavConfig>;
export type NavConfigInput = z.input<typeof NavConfig>;

/** Menu della decisione 4: Eventi a tendina con Calendario e i format (senza Baguette, che non ha una pagina sua). */
export const DEFAULT_NAV: NavConfig = {
  items: [
    { label: 'Home', href: '/', children: [] },
    { label: 'Scopri Gasperina', href: '/scopri-gasperina', children: [] },
    { label: 'Notizie', href: '/notizie', children: [] },
    { label: 'Eventi', href: '/eventi', children: [{ kind: 'link', label: 'Calendario', href: '/eventi' }, { kind: 'formats' }] },
    { label: 'Galleria', href: '/media', children: [] },
    { label: 'Chi Siamo', href: '/associazione', children: [] },
    { label: 'Sponsor', href: '/sponsor', children: [] },
    { label: 'Contatti', href: '/contatti', children: [] },
  ],
  cta: { label: 'Diventa socio', href: '/iscriviti' },
  hiddenFormats: [],
};

export type NavFormat = { slug: string; name: string; href: string };
export type ResolvedNavLink = { label: string; href: string };
export type ResolvedNavItem = ResolvedNavLink & { children: ResolvedNavLink[] };
export type ResolvedNav = { items: ResolvedNavItem[]; cta: ResolvedNavLink | null };

/** Legge la configurazione salvata; se manca o non è valida si usa il menu predefinito. */
export function parseNavConfig(raw: string | null | undefined): NavConfig {
  if (!raw) return DEFAULT_NAV;
  try {
    const parsed = NavConfig.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_NAV;
  } catch {
    return DEFAULT_NAV;
  }
}

/** Espande il segnaposto dei format e toglie i doppioni (stesso indirizzo nella stessa tendina). */
export function resolveNav(config: NavConfig, formats: readonly NavFormat[]): ResolvedNav {
  const visible = formats.filter((f) => !config.hiddenFormats.includes(f.slug));
  return {
    cta: config.cta,
    items: config.items.map((item) => {
      const children = item.children.flatMap((c) => (c.kind === 'link' ? [{ label: c.label, href: c.href }] : visible.map((f) => ({ label: f.name, href: f.href }))));
      const seen = new Set<string>();
      return { label: item.label, href: item.href, children: children.filter((c) => !seen.has(c.href) && !!seen.add(c.href)) };
    }),
  };
}

/** Voce attiva: stessa pagina o una sua sottopagina (la Home solo se esatta). */
export function isActiveHref(pathname: string, target: string): boolean {
  if (target === '/') return pathname === '/';
  const base = target.split('#')[0].split('?')[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}
