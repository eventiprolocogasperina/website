import type { CSSProperties } from 'react';

/** Colori delle pagine pubbliche d'acquisto, scelti dal pallino del format (series.theme.dot). */
export type EditionThemeKey = 'orange' | 'blue' | 'gold' | 'gray';

type Palette = {
  /** Pulsanti, passo attivo, prezzi. Contrasto almeno 4.5:1 sul bianco. */
  accent: string;
  accentHover: string;
  /**
   * Colore pieno del format per superfici grandi, gradienti e icone (arancio di Zuccaland #ea580c):
   * su bianco non arriva a 4.5:1, quindi mai per testo piccolo (§14.7). Testo bianco sopra solo grande e in grassetto.
   */
  brand: string;
  /** Fine del gradiente del format (brand → brandStrong). */
  brandStrong: string;
  /** Titoli e testo sui fondi tenui. */
  ink: string;
  /** Fondo della pagina, dall'alto in basso. */
  soft: string;
  softer: string;
  /** Fondo crema della pagina e macchie sfocate decorative (come l'hero di produzione). */
  surface: string;
  blob1: string;
  blob2: string;
  border: string;
  /** Ombra colorata dei riquadri. */
  glow: string;
  /** Testata scura del PDF dei biglietti. */
  pdfHeader: string;
  emoji: string;
};

const PALETTES: Record<EditionThemeKey, Palette> = {
  // Valori di ZuccalandClient.tsx (produzione): #ea580c → #c2410c, crema #fefce8, testo #431407, PDF #1a0d05.
  orange: { accent: '#c2410c', accentHover: '#9a3412', brand: '#ea580c', brandStrong: '#c2410c', ink: '#431407', soft: '#ffedd5', softer: '#fff7ed', surface: '#fefce8', blob1: '#fef08a', blob2: '#fed7aa', border: '#fed7aa', glow: 'rgb(234 88 12 / 0.18)', pdfHeader: '#1a0d05', emoji: '🎃' },
  // Assaggia e Passeggia 2026: blu #283983, oro #E8C042, crema #F9F3E4 (§14.3).
  blue: { accent: '#283983', accentHover: '#1f2c66', brand: '#283983', brandStrong: '#151e45', ink: '#151e45', soft: '#e8eef8', softer: '#f5f8fd', surface: '#f9f3e4', blob1: '#f3e2a6', blob2: '#e0e7ff', border: '#e7dfc8', glow: 'rgb(40 57 131 / 0.16)', pdfHeader: '#283983', emoji: '🍷' },
  gold: { accent: '#9a6a08', accentHover: '#7a5500', brand: '#c98f10', brandStrong: '#7a5500', ink: '#4a3300', soft: '#fdf0cf', softer: '#fffaf0', surface: '#fffaf0', blob1: '#fdf0cf', blob2: '#fde68a', border: '#f3d891', glow: 'rgb(201 143 16 / 0.2)', pdfHeader: '#2b1f00', emoji: '🥖' },
  gray: { accent: '#1b4baa', accentHover: '#163f8f', brand: '#1b4baa', brandStrong: '#0e2a6e', ink: '#151a2b', soft: '#eef0f5', softer: '#f8f9fc', surface: '#f8f9fc', blob1: '#e8eef8', blob2: '#f5ecd0', border: '#dfe3eb', glow: 'rgb(21 26 43 / 0.1)', pdfHeader: '#0e2a6e', emoji: '🎟️' },
};

export function editionTheme(dot: string | null | undefined): Palette & { key: EditionThemeKey } {
  const key = (dot && dot in PALETTES ? dot : 'gray') as EditionThemeKey;
  return { key, ...PALETTES[key] };
}

/** Identità del format nelle pagine pubbliche, nei biglietti e nelle email (series.theme, §14.3). */
export type EditionBrand = {
  dot: EditionThemeKey;
  logo: string | null;
  logoOnDark: string | null;
  mark: string | null;
  fontDisplay: 'cormorant' | 'outfit' | 'sans';
  fontBody: 'dm-sans' | 'inter';
};

/** Percorso del sito (/img/…) o indirizzo https: niente javascript:, data:, // o percorsi relativi. */
export const assetPath = (v: unknown): string | null => (typeof v === 'string' && v.length <= 300 && /^(\/(?!\/)|https:\/\/)[^\s"'<>()\\]+$/.test(v) ? v : null);
const oneOf = <T extends string>(v: unknown, values: readonly T[], fallback: T): T => (values.includes(v as T) ? (v as T) : fallback);

/**
 * Legge series.theme (jsonb) senza fidarsi: un valore sconosciuto o non valido torna al predefinito,
 * così un tema scritto male non rompe mai la pagina d'acquisto.
 */
export function readBrand(theme: unknown): EditionBrand {
  const t = (theme && typeof theme === 'object' ? theme : {}) as Record<string, unknown>;
  const logo = assetPath(t.logo);
  return {
    dot: oneOf(t.dot, ['orange', 'blue', 'gold', 'gray'] as const, 'gray'),
    logo,
    logoOnDark: assetPath(t.logoOnDark) ?? logo,
    mark: assetPath(t.mark),
    fontDisplay: oneOf(t.fontDisplay, ['cormorant', 'outfit', 'sans'] as const, 'sans'),
    fontBody: oneOf(t.fontBody, ['dm-sans', 'inter'] as const, 'dm-sans'),
  };
}

const DISPLAY_FONT: Record<EditionBrand['fontDisplay'], string> = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  // --font-outfit e --font-inter: next/font in src/components/public/brand-fonts.ts.
  outfit: "var(--font-outfit), 'DM Sans', ui-sans-serif, system-ui, sans-serif",
  sans: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
};
const BODY_FONT: Record<EditionBrand['fontBody'], string> = {
  'dm-sans': "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  inter: "var(--font-inter), 'DM Sans', ui-sans-serif, system-ui, sans-serif",
};

/**
 * Variabili CSS per il contenitore della pagina: il design system usa il colore dell'evento come
 * primario e resta sempre chiaro (data-theme="light" sul contenitore), anche se il sito è in tema scuro.
 * Con `brand` imposta anche i font del format (--ev-font-display, --ev-font-body).
 */
export function editionThemeStyle(dot: string | null | undefined, brand?: EditionBrand | null): CSSProperties {
  const t = editionTheme(dot);
  return {
    '--ui-primary': t.accent,
    '--ui-primary-hover': t.accentHover,
    '--ui-focus-ring': t.accent,
    '--ev-accent': t.accent,
    '--ev-brand': t.brand,
    '--ev-brand-strong': t.brandStrong,
    '--ev-ink': t.ink,
    '--ev-soft': t.soft,
    '--ev-softer': t.softer,
    '--ev-surface': t.surface,
    '--ev-blob-1': t.blob1,
    '--ev-blob-2': t.blob2,
    '--ev-border': t.border,
    '--ev-glow': t.glow,
    '--ev-font-display': DISPLAY_FONT[brand?.fontDisplay ?? 'sans'],
    '--ev-font-body': BODY_FONT[brand?.fontBody ?? 'dm-sans'],
  } as CSSProperties;
}

/**
 * Token del tema del format per le pagine a blocchi (§14.3): --brand e compagni. I valori di Zuccaland
 * vengono da ZuccalandClient.tsx (arancio #ea580c su crema #fefce8), quelli di A&P dal §14.3.
 */
type Brand = { brand: string; strong: string; fg: string; surface: string; soft: string; border: string; accent: string; ink: string; inkSoft: string; blob1: string; blob2: string };

const BRANDS: Record<EditionThemeKey, Brand> = {
  orange: { brand: '#ea580c', strong: '#c2410c', fg: '#ffffff', surface: '#fefce8', soft: '#ffedd5', border: '#fdba74', accent: '#f97316', ink: '#431407', inkSoft: '#7c2d12', blob1: '#fef08a', blob2: '#fed7aa' },
  blue: { brand: '#283983', strong: '#1f2c66', fg: '#ffffff', surface: '#F9F3E4', soft: '#e0e7ff', border: '#e7dfc8', accent: '#E8C042', ink: '#1a1a1a', inkSoft: '#555555', blob1: '#f3e2a6', blob2: '#e0e7ff' },
  gold: { brand: '#9a6a08', strong: '#7a5500', fg: '#ffffff', surface: '#fffaf0', soft: '#fdf0cf', border: '#f3d891', accent: '#c98f10', ink: '#4a3300', inkSoft: '#6b4c0a', blob1: '#fdf0cf', blob2: '#fde68a' },
  gray: { brand: '#1b4baa', strong: '#163f8f', fg: '#ffffff', surface: '#f8f9fc', soft: '#e8eef8', border: '#dfe3eb', accent: '#c9a227', ink: '#151a2b', inkSoft: '#4b5368', blob1: '#e8eef8', blob2: '#f5ecd0' },
};

export function brandThemeStyle(dot: string | null | undefined): CSSProperties {
  const key = (dot && dot in BRANDS ? dot : 'gray') as EditionThemeKey;
  const b = BRANDS[key];
  return {
    ...editionThemeStyle(key),
    '--ui-primary': b.brand,
    '--ui-primary-hover': b.strong,
    '--brand': b.brand,
    '--brand-strong': b.strong,
    '--brand-fg': b.fg,
    '--brand-surface': b.surface,
    '--brand-soft': b.soft,
    '--brand-border': b.border,
    '--brand-accent': b.accent,
    '--brand-ink': b.ink,
    '--brand-ink-soft': b.inkSoft,
    '--brand-blob-1': b.blob1,
    '--brand-blob-2': b.blob2,
  } as CSSProperties;
}
