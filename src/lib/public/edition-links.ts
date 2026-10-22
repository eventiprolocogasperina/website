import { readBlocks } from '@/components/public/blocks/schema';

export type EditionLinks = {
  /** Regolamento dell'edizione (voce "Regolamento…" del blocco Allegati), se c'è. */
  rulesUrl: string | null;
  /** "Come arrivare": indirizzo e link a Google Maps dal blocco Mappa, se c'è. */
  map: { address: string | null; url: string } | null;
};

const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/**
 * Link utili al checkout e alla conferma, letti dai blocchi della pagina dell'edizione (poi del format):
 * niente indirizzi o PDF scritti nel codice. Blocchi nascosti o non validi non contano.
 */
export function editionLinks(...pages: unknown[]): EditionLinks {
  const blocks = pages.flatMap((p) => readBlocks(p)).filter((b) => !b.hidden);
  let rulesUrl: string | null = null;
  let map: EditionLinks['map'] = null;
  for (const b of blocks) {
    if (!rulesUrl && b.type === 'Allegati') rulesUrl = b.props.items.find((i) => /regolament/i.test(i.label) && i.url)?.url ?? null;
    if (!map && b.type === 'Mappa') {
      const p = b.props;
      const url = p.mapsUrl || (p.lat !== null && p.lng !== null ? mapsSearch(`${p.lat},${p.lng}`) : p.address ? mapsSearch(p.address) : '');
      if (url) map = { address: p.address || null, url };
    }
  }
  return { rulesUrl, map };
}
