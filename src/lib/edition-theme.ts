import type { CSSProperties } from 'react';

/** Colori delle pagine pubbliche d'acquisto, scelti dal pallino del format (series.theme.dot). */
export type EditionThemeKey = 'orange' | 'blue' | 'gold' | 'gray';

type Palette = {
  /** Pulsanti, passo attivo, prezzi. Contrasto almeno 4.5:1 sul bianco. */
  accent: string;
  accentHover: string;
  /** Titoli e testo sui fondi tenui. */
  ink: string;
  /** Fondo della pagina, dall'alto in basso. */
  soft: string;
  softer: string;
  border: string;
  /** Ombra colorata dei riquadri. */
  glow: string;
  emoji: string;
};

const PALETTES: Record<EditionThemeKey, Palette> = {
  orange: { accent: '#c2410c', accentHover: '#9a3412', ink: '#431407', soft: '#ffedd5', softer: '#fff7ed', border: '#fed7aa', glow: 'rgb(234 88 12 / 0.18)', emoji: '🎃' },
  blue: { accent: '#1b4baa', accentHover: '#163f8f', ink: '#0e2a6e', soft: '#e8eef8', softer: '#f5f8fd', border: '#c9d6f0', glow: 'rgb(27 75 170 / 0.16)', emoji: '🍷' },
  gold: { accent: '#9a6a08', accentHover: '#7a5500', ink: '#4a3300', soft: '#fdf0cf', softer: '#fffaf0', border: '#f3d891', glow: 'rgb(201 143 16 / 0.2)', emoji: '🥖' },
  gray: { accent: '#1b4baa', accentHover: '#163f8f', ink: '#151a2b', soft: '#eef0f5', softer: '#f8f9fc', border: '#dfe3eb', glow: 'rgb(21 26 43 / 0.1)', emoji: '🎟️' },
};

export function editionTheme(dot: string | null | undefined): Palette & { key: EditionThemeKey } {
  const key = (dot && dot in PALETTES ? dot : 'gray') as EditionThemeKey;
  return { key, ...PALETTES[key] };
}

/**
 * Variabili CSS per il contenitore della pagina: il design system usa il colore dell'evento come
 * primario e resta sempre chiaro (data-theme="light" sul contenitore), anche se il sito è in tema scuro.
 */
export function editionThemeStyle(dot: string | null | undefined): CSSProperties {
  const t = editionTheme(dot);
  return {
    '--ui-primary': t.accent,
    '--ui-primary-hover': t.accentHover,
    '--ui-focus-ring': t.accent,
    '--ev-accent': t.accent,
    '--ev-ink': t.ink,
    '--ev-soft': t.soft,
    '--ev-softer': t.softer,
    '--ev-border': t.border,
    '--ev-glow': t.glow,
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
