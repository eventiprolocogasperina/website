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
