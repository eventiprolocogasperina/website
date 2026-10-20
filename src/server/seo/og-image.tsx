import 'server-only';
import { ImageResponse } from 'next/og';
import { editionTheme } from '@/lib/edition-theme';
import type { PublicEdition } from '@/lib/public/editions';
import { getEventBySlug } from '@/lib/data/events';
import { findPublicEdition } from '@/server/public/editions';

// Immagine di anteprima (Open Graph, 1200×630) generata per ogni edizione (§13.5): colori del format,
// titolo, data e luogo. Solo testo e colori: nessuna immagine esterna da scaricare, quindi sempre disponibile.
// Le pagine del format e dell'edizione (/zuccaland, /zuccaland/2026…) la usano dal loro opengraph-image.tsx.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

type Card = { eyebrow: string; title: string; detail: string | null; dot: string | null };

const dateLine = (d: Date | null) =>
  d ? d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' }) : null;

export function ogCard({ eyebrow, title, detail, dot }: Card): ImageResponse {
  const t = editionTheme(dot);
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: `linear-gradient(135deg, #0a0c12 0%, ${t.ink} 100%)`,
          color: '#ffffff',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, letterSpacing: 6, textTransform: 'uppercase', color: '#e8c042' }}>
          <span style={{ width: 18, height: 18, borderRadius: 9, background: t.accent, display: 'flex' }} />
          <span>{eyebrow}</span>
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 40 ? 76 : 96, lineHeight: 1.05, fontWeight: 600 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>
          <span>{detail ?? 'Gasperina (CZ)'}</span>
          <span style={{ fontSize: 28, color: '#e8c042' }}>prolocogasperina.it</span>
        </div>
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 14, background: t.accent, display: 'flex' }} />
      </div>
    ),
    OG_SIZE,
  );
}

export function editionOgCard(e: PublicEdition): ImageResponse {
  const detail = [dateLine(e.startsAt), e.location].filter(Boolean).join(' · ') || null;
  return ogCard({ eyebrow: e.series?.name ?? 'Pro Loco Gasperina', title: e.title, detail, dot: e.series?.dot ?? null });
}

/** Immagine per /eventi/[slug]: l'edizione (anche dal vecchio slug), altrimenti l'evento di oggi, altrimenti il sito. */
export async function eventOgImage(slug: string): Promise<ImageResponse> {
  try {
    const found = await findPublicEdition(slug);
    if (found) return editionOgCard(found.edition);
    const legacy = /^[a-z0-9-]{1,120}$/.test(slug) ? await getEventBySlug(slug) : undefined;
    if (legacy) return ogCard({ eyebrow: 'Pro Loco Gasperina', title: legacy.title, detail: legacy.dateLabel || legacy.location, dot: null });
  } catch {
    // Database non raggiungibile: si mostra comunque l'anteprima del sito.
  }
  return ogCard({ eyebrow: 'Pro Loco Gasperina', title: 'Eventi a Gasperina', detail: null, dot: null });
}
